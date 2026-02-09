import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Search } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  unit: string;
  image_url: string | null;
  category_id: string;
  supplier_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories: { name: string };
}

interface Category {
  id: string;
  name: string;
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchCategories();
    fetchProducts();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    
    // First get all active products
    let query = supabase
      .from("products")
      .select("*, categories(name)")
      .eq("is_active", true);

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data: productsData } = await query;
    
    if (productsData) {
      // Filter products by approved suppliers
      const approvedProducts = await Promise.all(
        productsData.map(async (product) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_approved")
            .eq("id", product.supplier_id)
            .single();
          
          return profile?.is_approved ? product : null;
        })
      );
      
      setProducts(approvedProducts.filter((p): p is Product => p !== null));
    }
    
    setLoading(false);
  };

  const addToCart = async (productId: string) => {
    if (!session) {
      toast.error("Please login to add items to cart");
      return;
    }

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        
        if (error) throw error;
        toast.success("Cart updated!");
        navigate("/cart");
      } else {
        // Insert new item
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: session.user.id,
            product_id: productId,
            quantity: 1,
          });
        
        if (error) throw error;
        toast.success("Added to cart!");
        navigate("/cart");
      }
    } catch (error: any) {
      console.error("Cart error:", error);
      toast.error(error.message || "Failed to add to cart");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Materials</h1>
          <p className="text-muted-foreground">Find quality construction materials from verified suppliers</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="aspect-square bg-muted rounded-md mb-4 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <span className="text-4xl">📦</span>
                    )}
                  </div>
                  <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{product.categories.name}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          KSh {product.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">per {product.unit}</p>
                      </div>
                      <p className="text-sm">
                        Stock: <span className="font-semibold">{product.stock_quantity}</span>
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock_quantity === 0}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
