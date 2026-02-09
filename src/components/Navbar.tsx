import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { ShoppingCart, Package, LayoutDashboard, LogOut, Receipt, Home, Grid, Plus, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Badge } from "./ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
        fetchCartCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
        fetchCartCount(session.user.id);
      } else {
        setUserRole(null);
        setCartItemCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchCartCount = async (userId: string) => {
    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", userId);
    
    if (data) {
      const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(totalItems);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    navigate("/");
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {session ? (
        <>
          <Link to="/" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
              <Home className="h-5 w-5 mr-2" />
              Home
            </Button>
          </Link>
          <Link to="/categories" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
              <Grid className="h-5 w-5 mr-2" />
              Categories
            </Button>
          </Link>
          <Link to="/products" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
              <Package className="h-5 w-5 mr-2" />
              Products
            </Button>
          </Link>
          
          {userRole === "customer" && (
            <>
              <Link to="/orders" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Orders
                </Button>
              </Link>
              <Link to="/cart" onClick={handleNavClick}>
                <Button variant="ghost" size={mobile ? "default" : "icon"} className={mobile ? "w-full justify-start relative" : "relative"}>
                  <ShoppingCart className="h-5 w-5" />
                  {mobile && <span className="ml-2">Cart</span>}
                  {cartItemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </>
          )}

          {userRole === "supplier" && (
            <>
              <Link to="/supplier/dashboard" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/supplier/dashboard" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Product
                </Button>
              </Link>
              <Link to="/supplier/products" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Package className="h-5 w-5 mr-2" />
                  My Products
                </Button>
              </Link>
              <Link to="/supplier/orders" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Incoming Orders
                </Button>
              </Link>
            </>
          )}

          {userRole === "admin" && (
            <>
              <Link to="/admin/dashboard" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <LayoutDashboard className="h-5 w-5 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/admin/users" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Package className="h-5 w-5 mr-2" />
                  Manage Users
                </Button>
              </Link>
              <Link to="/admin/products" onClick={handleNavClick}>
                <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>
                  <Package className="h-5 w-5 mr-2" />
                  Manage Products
                </Button>
              </Link>
            </>
          )}

          <Button variant="ghost" size={mobile ? "default" : "icon"} onClick={handleLogout} title="Logout" className={mobile ? "w-full justify-start" : ""}>
            <LogOut className="h-5 w-5" />
            {mobile && <span className="ml-2">Logout</span>}
          </Button>
        </>
      ) : (
        <>
          <Link to="/" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>Home</Button>
          </Link>
          <Link to="/products" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>Products</Button>
          </Link>
          <Link to="/auth/login" onClick={handleNavClick}>
            <Button variant="ghost" className={mobile ? "w-full justify-start" : ""}>Login</Button>
          </Link>
          <Link to="/auth/register" onClick={handleNavClick}>
            <Button variant="hero" className={mobile ? "w-full" : ""}>Get Started</Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">BuildMart</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <NavLinks />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-2 mt-8">
                  <NavLinks mobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};