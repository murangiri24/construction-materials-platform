import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Package, ShoppingCart, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  location: string;
  company_name: string | null;
  is_approved: boolean;
  user_roles: { role: string }[];
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  delivery_address: string;
  created_at: string;
  profiles: { full_name: string };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const [suppliers, setSuppliers] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSuppliers: 0,
    totalOrders: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    fetchSuppliers();
    fetchOrders();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchSuppliers = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "supplier");

    if (!roles) return;

    const supplierIds = roles.map(r => r.user_id);
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("id", supplierIds)
      .order("created_at", { ascending: false });

    if (data) setSuppliers(data.map(p => ({ ...p, user_roles: [{ role: "supplier" }] })) as Profile[]);
  };

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!ordersData) return;

    const ordersWithProfiles = await Promise.all(
      ordersData.map(async (order) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", order.customer_id)
          .single();
        
        return { ...order, profiles: { full_name: profile?.full_name || "Unknown" } };
      })
    );

    setOrders(ordersWithProfiles as Order[]);
  };

  const fetchStats = async () => {
    const [usersResult, suppliersResult, ordersResult, productsResult] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "supplier"),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: usersResult.count || 0,
      totalSuppliers: suppliersResult.count || 0,
      totalOrders: ordersResult.count || 0,
      totalProducts: productsResult.count || 0,
    });
  };

  const handleApproveSupplier = async (supplierId: string, approve: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: approve })
      .eq("id", supplierId);

    if (error) {
      toast.error("Failed to update supplier status");
    } else {
      toast.success(`Supplier ${approve ? "approved" : "deactivated"} successfully!`);
      fetchSuppliers();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
    } else {
      toast.success("Order status updated!");
      fetchOrders();
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setCategories(data);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const { error } = await supabase
      .from("categories")
      .insert([{ name: newCategory.name.trim(), description: newCategory.description.trim() || null }]);

    if (error) {
      toast.error("Failed to create category");
    } else {
      toast.success("Category created successfully!");
      setNewCategory({ name: "", description: "" });
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted successfully!");
      fetchCategories();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalUsers}</div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suppliers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalSuppliers}</div>
                <Package className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalOrders}</div>
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalProducts}</div>
                <Package className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Management</CardTitle>
                <CardDescription>Approve or deactivate supplier accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{supplier.full_name}</h3>
                          {supplier.is_approved ? (
                            <Badge className="bg-green-500">Approved</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {supplier.company_name} • {supplier.location}
                        </p>
                        <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        {!supplier.is_approved && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApproveSupplier(supplier.id, true)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        )}
                        {supplier.is_approved && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleApproveSupplier(supplier.id, false)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Monitor and manage order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{order.profiles.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          KSh {order.total_amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.delivery_address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            order.status === "delivered"
                              ? "bg-green-500"
                              : order.status === "processing"
                              ? "bg-blue-500"
                              : order.status === "cancelled"
                              ? "bg-red-500"
                              : ""
                          }
                        >
                          {order.status}
                        </Badge>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Category</CardTitle>
                <CardDescription>Add product categories for suppliers to use</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category Name *</label>
                    <Input
                      placeholder="e.g., Cement, Steel, Bricks"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Optional description for the category"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Category
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Categories</CardTitle>
                <CardDescription>Manage product categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No categories yet. Create one above!</p>
                  ) : (
                    categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-start justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(category.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
