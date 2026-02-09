import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, AlertCircle } from 'lucide-react';

interface DeliveryMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const DeliveryMap = ({ onLocationSelect, initialLat = -1.286389, initialLng = 36.817223 }: DeliveryMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    // If no API key, skip map loading and use fallback
    if (!apiKey) {
      setError('Map unavailable. Please enter your delivery address manually below.');
      return;
    }

    if (!mapRef.current || mapLoaded) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (!mapRef.current) return;

      try {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: initialLat, lng: initialLng },
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: false,
        });

        const marker = new google.maps.Marker({
          map,
          position: { lat: initialLat, lng: initialLng },
          draggable: true,
          title: 'Delivery Location'
        });

        markerRef.current = marker;

        const geocoder = new google.maps.Geocoder();

        const updateLocation = (lat: number, lng: number) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              onLocationSelect(lat, lng, results[0].formatted_address);
            } else {
              onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          });
        };

        marker.addListener('dragend', () => {
          const position = marker.getPosition();
          if (position) {
            updateLocation(position.lat(), position.lng());
          }
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            marker.setPosition(e.latLng);
            updateLocation(e.latLng.lat(), e.latLng.lng());
          }
        });

        updateLocation(initialLat, initialLng);
        setMapLoaded(true);
        setError('');
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Failed to initialize map. Please enter your address manually.');
      }
    };

    script.onerror = () => {
      setError('Failed to load Google Maps. Please enter your address manually.');
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey, initialLat, initialLng, mapLoaded, onLocationSelect]);

  // Handle manual address input for fallback
  const handleManualAddressChange = (value: string) => {
    setManualAddress(value);
    // Use default coordinates with manual address
    onLocationSelect(initialLat, initialLng, value);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Map Loading State */}
        {apiKey && !mapLoaded && !error && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading map...
          </div>
        )}
        
        {/* Error/Fallback Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Map Container - Only show if API key exists */}
        {apiKey && (
          <div 
            ref={mapRef} 
            className="w-full h-[400px] rounded-lg border"
            style={{ display: mapLoaded ? 'block' : 'none' }}
          />
        )}

        {/* Map Instructions */}
        {mapLoaded && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Click on the map or drag the marker to select your delivery location
          </p>
        )}

        {/* Manual Address Input Fallback */}
        {(!apiKey || error) && (
          <div className="space-y-2">
            <Label htmlFor="manual-address">Delivery Address</Label>
            <Input
              id="manual-address"
              placeholder="Enter your full delivery address"
              value={manualAddress}
              onChange={(e) => handleManualAddressChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default DeliveryMap;