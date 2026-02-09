import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShoppingBag, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeliveryMap from "@/components/DeliveryMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    unit: string;
    stock_quantity: number;
  };
}

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("cart_items")
      .select(`
        *,
        products(id, name, price, unit, stock_quantity)
      `)
      .eq("user_id", session.user.id);

    if (data) setCartItems(data as CartItem[]);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to update quantity");
    } else {
      fetchCartItems();
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);

    if (error) {
      toast.error("Failed to remove item");
    } else {
      toast.success("Item removed from cart");
      fetchCartItems();
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!deliveryAddress) {
      toast.error("Please enter a delivery address");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get supplier_id for each product
      const productsWithSuppliers = await Promise.all(
        cartItems.map(async (item) => {
          const { data: product } = await supabase
            .from("products")
            .select("supplier_id")
            .eq("id", item.products.id)
            .single();
          return { ...item, supplier_id: product?.supplier_id };
        })
      );

      // Prepare items for atomic checkout
      const checkoutItems = productsWithSuppliers.map((item) => ({
        product_id: item.products.id,
        supplier_id: item.supplier_id,
        quantity: item.quantity,
        price_at_purchase: item.products.price,
      }));

      // Store total before checkout clears the cart
      const orderTotal = calculateTotal();

      // Use atomic checkout function to prevent race conditions
      const { data: orderId, error: checkoutError } = await supabase.rpc('complete_checkout', {
        p_customer_id: session.user.id,
        p_delivery_address: deliveryAddress,
        p_delivery_lat: deliveryLat,
        p_delivery_lng: deliveryLng,
        p_total_amount: orderTotal,
        p_notes: notes || '',
        p_items: checkoutItems,
      });

      if (checkoutError) throw checkoutError;

      // Store order ID and total, then show payment dialog
      setCurrentOrderId(orderId);
      setOrderTotal(orderTotal);
      setShowPaymentDialog(true);
      
      // Refresh cart (should be empty now)
      fetchCartItems();
      setLoading(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your M-Pesa phone number");
      return;
    }

    // Validate phone number format (Kenyan numbers)
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast.error("Please enter a valid Kenyan phone number (e.g., 254712345678 or 0712345678)");
      return;
    }

    setLoading(true);

    try {
      // Format phone number to 254 format
      let formattedPhone = phoneNumber;
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '254' + phoneNumber.substring(1);
      }

      // Call M-Pesa payment function
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phone: formattedPhone,
          amount: orderTotal,
          orderId: currentOrderId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Payment request sent! Please check your phone and enter your M-Pesa PIN.");
        
        // Cart was already cleared by atomic checkout function
        // Close dialog and navigate to orders
        setShowPaymentDialog(false);
        setTimeout(() => {
          navigate("/orders");
        }, 2000);
      } else {
        throw new Error(data.error || "Payment failed");
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Shopping Cart</h1>
          <Button variant="outline" onClick={() => navigate("/products")}>
            Continue Shopping
          </Button>
        </div>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/products")} variant="hero">
              Browse Products
            </Button>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.products.name}</h3>
                        <p className="text-muted-foreground">
                          KSh {item.products.price.toLocaleString()} per {item.products.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <p className="font-bold text-lg w-32 text-right">
                          KSh {(item.products.price * item.quantity).toLocaleString()}
                        </p>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DeliveryMap
                    onLocationSelect={(lat, lng, address) => {
                      setDeliveryLat(lat);
                      setDeliveryLng(lng);
                      setDeliveryAddress(address);
                    }}
                  />
                  
                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Select location on map or enter address manually"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions?"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Subtotal</span>
                    <span>KSh {calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">KSh {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant="hero"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? "Creating Order..." : "Proceed to Payment"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Pay securely with M-Pesa
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* M-Pesa Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              M-Pesa Payment
            </DialogTitle>
            <DialogDescription>
              Enter your M-Pesa phone number to complete the payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g., 0712345678 or 254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                type="tel"
              />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Order Summary</p>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-primary">KSh {orderTotal.toLocaleString()}</span>
              </div>
            </div>
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full"
              variant="hero"
              size="lg"
            >
              {loading ? "Processing..." : "Pay with M-Pesa"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You will receive a prompt on your phone to enter your M-Pesa PIN
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;
