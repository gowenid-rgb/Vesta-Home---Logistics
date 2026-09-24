'use client'

import React, { useState, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import axios from 'axios'
import { MapPin, Warehouse, Home, Package, Route, Truck, Users } from 'lucide-react'

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

  // Route Builder State
  const [routeStops, setRouteStops] = useState<any[]>([])
  const [routePlan, setRoutePlan] = useState<any | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

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

  const handleAddToRoute = () => {
    if (selectedLocation && !routeStops.find(s => s.id === selectedLocation.id)) {
      setRouteStops([...routeStops, selectedLocation])
      setRoutePlan(null) // reset plan when stops change
    }
  }

  const handleRemoveFromRoute = (id: number) => {
    setRouteStops(routeStops.filter(s => s.id !== id))
    setRoutePlan(null)
  }

  const handleGeneratePlan = () => {
    if (routeStops.length === 0) return
    setLoadingPlan(true)
    const location_ids = routeStops.map(s => s.id)
    axios.post(`${API_URL}/api/route-plan`, { location_ids })
      .then(res => {
        setRoutePlan(res.data)
        setLoadingPlan(false)
      })
      .catch(err => {
        console.error("Failed to generate plan", err)
        setLoadingPlan(false)
      })
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar - Inventory */}
      <div className="w-[400px] h-full bg-white shadow-xl flex flex-col z-10 border-r border-gray-200 shrink-0">
        <div className="p-6 bg-gray-900 text-white shrink-0">
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {selectedLocation.is_warehouse ? (
                      <Warehouse className="text-blue-600" />
                    ) : (
                      <Home className="text-emerald-600" />
                    )}
                    <h2 className="text-xl font-bold text-gray-800">{selectedLocation.name}</h2>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">{selectedLocation.address}</p>
                <div className="flex items-center justify-between">
                  <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                    {selectedLocation.inventory_count} Items in {selectedLocation.is_warehouse ? 'Storage' : 'Staging'}
                  </div>
                  <button 
                    onClick={handleAddToRoute}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Route size={14} /> Add to Route
                  </button>
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
                <div className="space-y-4 pb-20">
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
      <div className="flex-1 h-full relative">
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
                    ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
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

      {/* Route Builder Drawer (Right side) */}
      <div className="w-[350px] h-full bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] flex flex-col z-10 shrink-0">
        <div className="p-6 bg-gray-50 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Route size={20} className="text-indigo-600" /> Route Builder
          </h2>
          <p className="text-xs text-gray-500 mt-1">Select locations to calculate logistics.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {routeStops.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">
              No stops added to route yet.
            </div>
          ) : (
            <div className="space-y-3">
              {routeStops.map((stop, idx) => (
                <div key={stop.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-start justify-between relative">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{stop.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{stop.address}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFromRoute(stop.id)} className="text-red-400 hover:text-red-600 text-xs">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Action Area */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          {routePlan ? (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                ✨ AI Logistics Plan
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white p-3 rounded shadow-sm flex flex-col items-center justify-center">
                  <Truck className="text-indigo-500 mb-1" size={20} />
                  <span className="text-xs text-gray-500">Recommended</span>
                  <span className="font-bold text-gray-800 text-center text-sm">{routePlan.truck}</span>
                </div>
                <div className="bg-white p-3 rounded shadow-sm flex flex-col items-center justify-center">
                  <Users className="text-indigo-500 mb-1" size={20} />
                  <span className="text-xs text-gray-500">Manpower</span>
                  <span className="font-bold text-gray-800 text-center text-sm">{routePlan.movers}</span>
                </div>
              </div>
              <p className="text-xs text-indigo-800 italic leading-relaxed">
                "{routePlan.reason}"
              </p>
            </div>
          ) : (
            <button 
              onClick={handleGeneratePlan}
              disabled={routeStops.length < 2 || loadingPlan}
              className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                routeStops.length < 2 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
              }`}
            >
              {loadingPlan ? (
                <>Generating AI Plan...</>
              ) : (
                <>✨ Generate AI Route Plan</>
              )}
            </button>
          )}
          {routeStops.length < 2 && !routePlan && (
            <p className="text-center text-xs text-gray-500 mt-2">Add at least 2 stops to generate a plan.</p>
          )}
        </div>
      </div>
    </div>
  )
}
