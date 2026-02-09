import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Package, Shield, Truck, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--gradient-hero))]">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Construction Materials<br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Delivered On-Demand
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with verified suppliers. Order quality construction materials. 
            Get real-time delivery tracking. Build with confidence.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth/register">
              <Button variant="hero" size="lg">
                Start Building Today
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg">
                Browse Materials
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose BuildMart?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Wide Selection</h3>
              <p className="text-sm text-muted-foreground">
                Access thousands of quality construction materials from verified suppliers
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Verified Suppliers</h3>
              <p className="text-sm text-muted-foreground">
                All suppliers are vetted and approved by our admin team
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track your deliveries in real-time with GPS integration
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Get your materials delivered quickly to keep your project on schedule
              </p>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="p-12 text-center bg-gradient-to-r from-primary/5 to-secondary/5 border-none">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Building?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of builders and contractors who trust BuildMart for their construction material needs.
            </p>
            <Link to="/auth/register">
              <Button variant="hero" size="lg">
                Create Your Account
              </Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 BuildMart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
