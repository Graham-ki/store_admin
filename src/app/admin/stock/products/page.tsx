'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, startOfDay, startOfMonth, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

type Product = {
  id: number;
  title: string;
  maxQuantity: number;
};

type ProductEntry = {
  id: number;
  product_id: number;
  title: string;
  quantity: number;
  created_at: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('All');
  const [customDate, setCustomDate] = useState('');

  // Fetch Products List
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('id, title, maxQuantity');
      if (error) console.error('Error fetching products:', error);
      else setProducts(data || []);
    };

    fetchProducts();
  }, []);

  // Fetch Product Entries
  useEffect(() => {
    const fetchProductEntries = async () => {
      const { data, error } = await supabase
        .from('product_entries')
        .select('*')
        .eq('Created_by', 'Store Manager') // Filter by 'Store Manager'
        .order('created_at', { ascending: false });
    
      if (error) console.error('Error fetching product entries:', error);
      else setProductEntries(data || []);
    };

    fetchProductEntries();
  }, []);

  // Handle Product Entry Submission
  const handleSubmit = async () => {
    if (!selectedProduct || !quantity) {
      alert('Please select a product and enter a quantity.');
      return;
    }

    setLoading(true);

    // Find selected product name
    const productName = products.find((p) => p.id === selectedProduct)?.title || '';

    // Insert into product_entries
    const { error: entryError } = await supabase.from('product_entries').insert([
      {
        product_id: selectedProduct,
        title: productName,
        quantity: Number(quantity),
        Created_by: 'Store Manager',
      },
    ]);

    if (entryError) {
      console.error('Error inserting product entry:', entryError);
      alert('Failed to add product entry.');
      setLoading(false);
      return;
    }

    // Update maxQuantity in product table
    const currentProduct = products.find((p) => p.id === selectedProduct);
    if (currentProduct) {
      const newQuantity = currentProduct.maxQuantity + Number(quantity);
      const { error: updateError } = await supabase
        .from('product')
        .update({ maxQuantity: newQuantity })
        .eq('id', selectedProduct);

      if (updateError) {
        console.error('Error updating maxQuantity:', updateError);
        alert('Failed to update product quantity.');
        setLoading(false);
        return;
      }
    }

    // Refresh data
    alert('Product entry added successfully!');
    window.location.reload();
  };

  // Filtered product entries based on date
  const filteredProductEntries = productEntries.filter((entry) => {
    const entryDate = new Date(entry.created_at);
    const today = startOfDay(new Date());

    switch (dateFilter) {
      case 'Daily':
        return entryDate >= today;
      case 'Monthly':
        return entryDate >= startOfMonth(today);
      case 'Yearly':
        return entryDate >= startOfYear(today);
      case 'Custom':
        return customDate ? format(entryDate, 'yyyy-MM-dd') === customDate : true;
      default:
        return true;
    }
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white">
        Beverages Management
      </h1>

      {/* Filter Section */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <h2 className="font-semibold text-sky-500">Filter Entries:</h2>
        <Select onValueChange={setDateFilter} defaultValue="All">
          <SelectTrigger className="w-[150px] shadow-sm text-sky-500">
            <SelectValue>{dateFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Yearly">Yearly</SelectItem>
            <SelectItem value="Custom">Custom Date</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === 'Custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="border rounded-md p-2 shadow-sm"
          />
        )}
      </div>

      {/* Button to Open Entry Form */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default">Add</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new items produced</DialogTitle>
            <DialogDescription>This entry cannot be changed!</DialogDescription>
          </DialogHeader>

          {/* Product Selection */}
          <Select onValueChange={(value) => setSelectedProduct(Number(value))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={String(product.id)}>
                  {product.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quantity Input */}
          <Input
            type="number"
            placeholder="Number of boxes"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full"
          />

          {/* Submit Button */}
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Product Entries Table */}
      <div className="overflow-x-auto mt-6">
        <Table className="transition-shadow duration-300 hover:shadow-lg">
          <TableHeader>
            <TableRow>
              <TableHead className="shadow-md">Beverage Name</TableHead>
              <TableHead className="shadow-md">Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProductEntries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-gray-100 transition-colors duration-200">
                <TableCell>{entry.title}</TableCell>
                <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
