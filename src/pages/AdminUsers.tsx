import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  is_approved: boolean;
  user_roles: { role: string }[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles(role)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data as any);
    }
  };

  const handleApprove = async (userId: string) => {
    await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);
    
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
            <p className="text-muted-foreground">View and manage user accounts</p>
          </div>
          <Button onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</Button>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{user.full_name || "Unnamed User"}</CardTitle>
                    <CardDescription>{user.phone}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {user.user_roles?.map((role, idx) => (
                      <Badge key={idx} variant="outline">
                        {role.role}
                      </Badge>
                    ))}
                    {user.is_approved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {user.company_name && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Company:</strong> {user.company_name}
                    </p>
                  )}
                  {!user.is_approved && user.user_roles?.some(r => r.role === "supplier") && (
                    <Button onClick={() => handleApprove(user.id)} size="sm">
                      Approve Supplier
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
