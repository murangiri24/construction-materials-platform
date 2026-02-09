import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  product_id: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  delivery_address: string;
  total_amount: number;
  order_items: OrderItem[];
}

const SupplierOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchSupplierOrders();
  }, []);

  const fetchSupplierOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("order_items")
      .select(`
        *,
        products(name),
        orders(*)
      `)
      .eq("supplier_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const groupedOrders = data.reduce((acc: any, item: any) => {
        const orderId = item.orders.id;
        if (!acc[orderId]) {
          acc[orderId] = {
            ...item.orders,
            order_items: []
          };
        }
        acc[orderId].order_items.push({
          id: item.id,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
          product_id: item.product_id,
          products: item.products
        });
        return acc;
      }, {});

      setOrders(Object.values(groupedOrders));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "processing": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Incoming Orders</h1>
          <p className="text-muted-foreground">Orders containing your products</p>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                    <CardDescription>
                      {new Date(order.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Delivery:</strong> {order.delivery_address}
                  </p>
                  <div>
                    <p className="font-medium mb-2">Your Items:</p>
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.products.name} × {item.quantity}</span>
                        <span>KSH {item.price_at_purchase}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {orders.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No orders yet</p>
              <p className="text-muted-foreground">Orders containing your products will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SupplierOrders;
