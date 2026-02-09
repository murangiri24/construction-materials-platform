import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  unit: string;
  is_active: boolean;
  image_url: string;
  categories: { name: string };
  profiles: { full_name: string; company_name: string };
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        categories(name),
        profiles:supplier_id(full_name, company_name)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setProducts(data as any);
    }
  };

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", productId);
    
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Products</h1>
            <p className="text-muted-foreground">View and manage all products</p>
          </div>
          <Button onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex justify-between items-start">
                  <CardTitle className="flex-1">{product.name}</CardTitle>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">KSH {product.price}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.stock_quantity} {product.unit}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Category: {product.categories?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supplier: {product.profiles?.company_name || product.profiles?.full_name}
                  </p>
                  <Button
                    onClick={() => toggleActive(product.id, product.is_active)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {product.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
