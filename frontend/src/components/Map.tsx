'use client'

import React, { useState, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import axios from 'axios'
import { MapPin, Warehouse, Home, Package } from 'lucide-react'

const containerStyle = {
  width: '100%',
  height: '100%'
}

// Center of Los Angeles
const center = {
  lat: 34.0522,
  lng: -118.2437
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function MapDashboard() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY || ''
  })

  const [locations, setLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)

  useEffect(() => {
    // Fetch locations from backend
    axios.get(`${API_URL}/api/locations`)
      .then(res => setLocations(res.data))
      .catch(err => console.error("Failed to load locations", err))
  }, [])

  const handleMarkerClick = (loc: any) => {
    setSelectedLocation(loc)
    setLoadingInventory(true)
    axios.get(`${API_URL}/api/locations/${loc.id}/inventory`)
      .then(res => {
        setInventory(res.data)
        setLoadingInventory(false)
      })
      .catch(err => {
        console.error("Failed to load inventory", err)
        setLoadingInventory(false)
      })
  }

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-1/3 h-full bg-white shadow-xl flex flex-col z-10 border-r border-gray-200">
        <div className="p-6 bg-gray-900 text-white">
          <h1 className="text-2xl font-bold tracking-wider uppercase">Vesta Logistics</h1>
          <p className="text-gray-400 text-sm mt-1">Headquarters Dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedLocation ? (
            <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
              <MapPin size={48} className="mb-4 opacity-20" />
              <p>Select a location on the map<br/>to view its inventory.</p>
            </div>
          ) : (
            <div>
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  {selectedLocation.is_warehouse ? (
                    <Warehouse className="text-blue-600" />
                  ) : (
                    <Home className="text-emerald-600" />
                  )}
                  <h2 className="text-xl font-bold text-gray-800">{selectedLocation.name}</h2>
                </div>
                <p className="text-sm text-gray-500">{selectedLocation.address}</p>
                <div className="mt-4 inline-block bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                  {selectedLocation.inventory_count} Items in {selectedLocation.is_warehouse ? 'Storage' : 'Staging'}
                </div>
              </div>

              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={18} /> Location Inventory
              </h3>
              
              {loadingInventory ? (
                <div className="animate-pulse flex flex-col gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {inventory.map((item, i) => (
                    <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-lg hover:shadow-md transition-shadow bg-white">
                      <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {item.furniture.image_url && (
                          <img src={item.furniture.image_url} alt={item.furniture.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="font-medium text-sm text-gray-800 line-clamp-2">{item.furniture.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Status: <span className="font-semibold">{item.status}</span></p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="w-2/3 h-full relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={11}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                {
                  "featureType": "all",
                  "elementType": "geometry.fill",
                  "stylers": [{"weight": "2.00"}]
                },
                {
                  "featureType": "all",
                  "elementType": "geometry.stroke",
                  "stylers": [{"color": "#9c9c9c"}]
                },
                {
                  "featureType": "all",
                  "elementType": "labels.text",
                  "stylers": [{"visibility": "on"}]
                }
              ]
            }}
          >
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => handleMarkerClick(loc)}
                icon={{
                  url: loc.is_warehouse 
                    ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Loading Map...</p>
          </div>
        )}
      </div>
    </div>
  )
}
