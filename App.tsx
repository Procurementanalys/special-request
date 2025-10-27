import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Store, Product, RequestItem, MasterData, Status } from './types';
import { SCRIPT_URL } from './constants';

const App: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true);
      setStatus({ type: 'info', message: 'Loading master data...' });
      try {
        const res = await fetch(SCRIPT_URL);
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.statusText}`);
        }
        const data: MasterData = await res.json();
        setStores(data.stores);
        setProducts(data.items);
        setStatus({ type: 'idle', message: '' });
      } catch (error: any) {
        console.error('Failed to load master data:', error);
        setStatus({ type: 'error', message: `Gagal load master data: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts([]);
      return;
    }

    const results = products
      .filter(
        p => p.code.toLowerCase().includes(searchTerm.toLowerCase()) || p.desc.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10);
    setFilteredProducts(results);
  }, [searchTerm, products]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setFilteredProducts([]);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddItem = (product: Product) => {
    // Check if item already exists to prevent duplicates
    if (requestItems.some(item => item.code === product.code)) {
        setStatus({ type: 'info', message: 'Produk sudah ada di daftar.'});
        setTimeout(() => setStatus({type: 'idle', message: ''}), 3000);
        return;
    }
    
    const newItem: RequestItem = {
      ...product,
      id: `${product.code}-${Date.now()}`,
      qty: 1,
      reason: '',
    };
    setRequestItems(prevItems => [...prevItems, newItem]);
    setSearchTerm('');
    setFilteredProducts([]);
  };

  const handleItemChange = (id: string, field: 'qty' | 'reason', value: string | number) => {
    setRequestItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setRequestItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  const handleSubmit = useCallback(async () => {
    if (!selectedStore) {
        setStatus({ type: 'error', message: 'Pilih store terlebih dahulu!' });
        return;
    }
    if (requestItems.length === 0) {
        setStatus({ type: 'error', message: 'Tambahkan minimal satu item!' });
        return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'info', message: 'Mengirim data...' });

    const payload = {
        store: selectedStore,
        items: requestItems.map(({ code, desc, qty, reason }) => ({
            procode: code,
            prodesc: desc,
            qty: String(qty),
            reason,
        })),
    };

    try {
        // To fix the "Failed to fetch" CORS error with Google Apps Script, we use 'no-cors' mode.
        // This sends the request but makes the response opaque, meaning we can't read
        // the status or body. We assume the request succeeded if no network error is thrown.
        // The Google Apps Script must be set up to parse a JSON string from the POST body.
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Bypasses CORS preflight, but makes response unreadable.
            // No 'Content-Type' header is set, so it defaults to text/plain, which is fine for a simple request.
            body: JSON.stringify(payload),
        });

        // Since we can't read the response, we assume success and inform the user.
        setStatus({ type: 'success', message: '✅ Data berhasil dikirim! Mohon periksa Google Sheet untuk konfirmasi.' });
        setRequestItems([]);
        setSelectedStore('');
        setTimeout(() => setStatus({type: 'idle', message: ''}), 5000);

    } catch (error: any) {
        console.error('Submit error:', error);
        // This will now only catch network-level errors (e.g., offline), not application errors from the script.
        setStatus({ type: 'error', message: `❌ Gagal submit: Terjadi kesalahan jaringan. Pastikan Anda terhubung ke internet.` });
    } finally {
        setIsSubmitting(false);
    }
  }, [selectedStore, requestItems]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Form Special Request Store</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="storeSelect" className="block text-sm font-medium text-gray-700 mb-1">Pilih Store:</label>
            <select
              id="storeSelect"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? <option>Loading stores...</option> : <option value="">Pilih Store</option>}
              {stores.map(store => (
                <option key={store.code} value={`[${store.code}] ${store.name}`}>
                  {`[${store.code}] ${store.name}`}
                </option>
              ))}
            </select>
          </div>
          <div className="relative" ref={searchContainerRef}>
            <label htmlFor="productSearch" className="block text-sm font-medium text-gray-700 mb-1">Cari Produk:</label>
            <input
              type="text"
              id="productSearch"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik kode / nama produk"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading || products.length === 0}
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.code}
                    onClick={() => handleAddItem(product)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50"
                  >
                    {product.code} - {product.desc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Daftar Item</h2>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Procode</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prodesc</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requestItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Belum ada item yang ditambahkan.
                  </td>
                </tr>
              ) : (
                requestItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.desc}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.reason}
                        onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                        placeholder="pesenan customer"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
            <div className="flex-grow">
            {status.message && (
                <p className={`text-sm font-semibold ${status.type === 'error' ? 'text-red-600' : status.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>
                    {status.message}
                </p>
            )}
            </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
