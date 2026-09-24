'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api'
import axios from 'axios'
import { MapPin, Warehouse, Home, Package, Route, Truck, Users, ArrowLeft } from 'lucide-react'

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

  const mapRef = useRef<google.maps.Map | null>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [visibleLocations, setVisibleLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null)
  const [inventory, setInventory] = useState<any[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [debugError, setDebugError] = useState<string>('')

  // Route Builder State
  const [routeStops, setRouteStops] = useState<any[]>([])
  const [routePlan, setRoutePlan] = useState<any | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  
  // Filters State
  const [activeFilters, setActiveFilters] = useState<string[]>(['Warehouse', 'In Staging', 'Staged', 'Sold'])

  const fetchLocations = () => {
    setDebugError('Fetching...')
    axios.get(`${API_URL}/api/locations?t=${new Date().getTime()}`)
      .then(res => {
        // Mock status for prototype based on ID
        const processedLocations = res.data.map((loc: any) => {
          let status = 'Warehouse'
          if (!loc.is_warehouse) {
            if (loc.id % 3 === 0) status = 'In Staging'
            else if (loc.id % 3 === 1) status = 'Staged'
            else status = 'Sold'
          }
          return { ...loc, status }
        })
        setLocations(processedLocations)
        setVisibleLocations(processedLocations)
        setDebugError(`Success. Count: ${res.data.length}`)
      })
      .catch(err => {
        console.error("Failed to load locations", err)
        setDebugError(`Error: ${err.message}. URL: ${API_URL}`)
      })
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  // Filter locations based on active filters
  const filteredLocations = locations.filter(loc => activeFilters.includes(loc.status))

  const updateVisibleLocations = useCallback(() => {
    if (mapRef.current && filteredLocations.length > 0) {
      const bounds = mapRef.current.getBounds()
      if (bounds) {
        const visible = filteredLocations.filter(loc => {
          const latLng = new google.maps.LatLng(loc.latitude, loc.longitude)
          return bounds.contains(latLng)
        })
        setVisibleLocations(visible)
      }
    } else if (filteredLocations.length === 0) {
      setVisibleLocations([])
    }
  }, [filteredLocations])

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    updateVisibleLocations()
  }, [updateVisibleLocations])

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  // Deselect if active filters change and hide the selected location
  useEffect(() => {
    if (selectedLocation && !activeFilters.includes(selectedLocation.status)) {
      setSelectedLocation(null)
    }
  }, [activeFilters])

  // Zoom to selected location
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.panTo({ lat: selectedLocation.latitude, lng: selectedLocation.longitude })
      mapRef.current.setZoom(16)
    } else if (!selectedLocation && mapRef.current) {
      mapRef.current.panTo(center)
      mapRef.current.setZoom(11)
    }
  }, [selectedLocation])

  const handleMarkerClick = (loc: any) => {
    setSelectedLocation(loc)
    setLoadingInventory(true)
    axios.get(`${API_URL}/api/locations/${loc.id}/inventory?t=${new Date().getTime()}`)
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
      setDirections(null)
    }
  }

  const handleRemoveFromRoute = (id: number) => {
    setRouteStops(routeStops.filter(s => s.id !== id))
    setRoutePlan(null)
    setDirections(null)
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

  const updateItemStatus = (inventoryId: number, newStatus: string) => {
    // Optimistic UI update
    setInventory(prev => prev.map(item => 
      item.id === inventoryId ? { ...item, status: newStatus } : item
    ))
    
    // API Call
    axios.patch(`${API_URL}/api/inventory/${inventoryId}/status`, { status: newStatus })
      .catch(err => {
        console.error("Failed to update status", err)
        // Revert on failure could go here
      })
  }

  // Calculate Aggregates for selected location
  const totalValue = inventory.reduce((sum, item) => sum + ((item.furniture.price || 0) * item.quantity), 0)
  // Simulate weight if not present in DB (e.g. 10 lbs per $100 of value, just for the prototype)
  const totalWeight = inventory.reduce((sum, item) => sum + ((item.furniture.price || 500) * 0.1 * item.quantity), 0)

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar - Locations & Inventory */}
      <div className="w-[450px] h-full bg-white shadow-xl flex flex-col z-10 border-r border-gray-200 shrink-0">
        <div className="p-6 bg-gray-900 text-white shrink-0">
          <h1 className="text-2xl font-bold tracking-wider uppercase">Vesta Logistics</h1>
          <p className="text-gray-400 text-sm mt-1">Headquarters Dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!selectedLocation ? (
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
                Visible Map Locations ({visibleLocations.length})
              </h3>
              <div className="space-y-3">
                {visibleLocations.length === 0 ? (
                  <p className="text-gray-400 text-sm px-2">No locations visible in this map area.</p>
                ) : (
                  visibleLocations.map(loc => (
                    <div 
                      key={loc.id} 
                      onClick={() => handleMarkerClick(loc)}
                      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-full ${
                          loc.is_warehouse ? 'bg-blue-100 text-blue-600' : 
                          loc.status === 'In Staging' ? 'bg-amber-100 text-amber-600' :
                          loc.status === 'Sold' ? 'bg-purple-100 text-purple-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {loc.is_warehouse ? <Warehouse size={20} /> : <Home size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800">{loc.name}</h4>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                              loc.is_warehouse ? 'bg-blue-100 text-blue-700' :
                              loc.status === 'In Staging' ? 'bg-amber-100 text-amber-700' :
                              loc.status === 'Sold' ? 'bg-purple-100 text-purple-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {loc.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">{loc.address}</p>
                          <div className="mt-2 inline-block bg-gray-100 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-600 uppercase">
                            {loc.inventory_count} Items
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white min-h-full">
              <div className="p-6 border-b border-gray-100">
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold mb-6 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Map View
                </button>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {selectedLocation.is_warehouse ? (
                      <Warehouse className="text-blue-600" size={28} />
                    ) : (
                      <Home className="text-emerald-600" size={28} />
                    )}
                    <h2 className="text-2xl font-bold text-gray-900">{selectedLocation.name}</h2>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">{selectedLocation.address}</p>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Items</p>
                    <p className="text-lg font-bold text-gray-800">{selectedLocation.inventory_count}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Value</p>
                    <p className="text-lg font-bold text-emerald-600">${totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Est. Weight</p>
                    <p className="text-lg font-bold text-gray-800">{totalWeight.toLocaleString(undefined, {maximumFractionDigits: 0})} lbs</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleAddToRoute}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Route size={16} /> Add to Dispatch Route
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                  <Package size={20} className="text-gray-400" /> Itemized Inventory
                </h3>
                
                {loadingInventory ? (
                  <div className="animate-pulse flex flex-col gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-24 bg-gray-50 rounded-xl"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 pb-20">
                    {inventory.map((item, i) => {
                      const itemValue = (item.furniture.price || 0) * item.quantity;
                      return (
                        <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-xl hover:border-gray-300 transition-colors bg-white shadow-sm">
                          <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                            {item.furniture.image_url ? (
                              <img src={item.furniture.image_url} alt={item.furniture.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={32} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col justify-between flex-1 py-1">
                            <div>
                              <p className="font-bold text-sm text-gray-900 leading-tight mb-2">{item.furniture.name}</p>
                              <div className="flex bg-gray-100 rounded-md p-1 gap-1 w-max">
                                {['Staged', 'Outgoing', 'Incoming'].map(status => (
                                  <button
                                    key={status}
                                    onClick={() => updateItemStatus(item.id, status)}
                                    className={`px-2 py-1 text-[9px] font-bold uppercase rounded-sm transition-colors ${
                                      item.status === status 
                                        ? status === 'Staged' ? 'bg-emerald-100 text-emerald-800 shadow-sm' 
                                          : status === 'Outgoing' ? 'bg-amber-100 text-amber-800 shadow-sm'
                                          : 'bg-blue-100 text-blue-800 shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-end justify-between mt-2">
                              <p className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Qty: {item.quantity}</p>
                              <p className="text-sm font-bold text-emerald-600">${itemValue.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 h-full relative">
        <div className="absolute top-4 left-4 z-50 bg-white/90 p-4 rounded shadow-lg border border-red-200 text-xs text-black max-w-sm font-mono hidden">
          <p className="font-bold text-red-600 mb-1">DEV DEBUG PANEL</p>
          <p><strong>API_URL:</strong> {API_URL}</p>
          <p><strong>LOCATIONS_COUNT:</strong> {locations.length}</p>
          <p><strong>STATUS:</strong> {debugError}</p>
          <button onClick={fetchLocations} className="mt-2 bg-blue-500 text-white px-2 py-1 rounded">Retry Fetch</button>
        </div>
        
        {/* Filter Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white shadow-lg rounded-full px-2 py-2 border border-gray-200 flex items-center gap-2">
          {['Warehouse', 'In Staging', 'Staged', 'Sold'].map(filter => {
            const isActive = activeFilters.includes(filter)
            let colorClass = 'bg-gray-100 text-gray-600 border-transparent'
            if (isActive) {
              if (filter === 'Warehouse') colorClass = 'bg-blue-100 text-blue-700 border-blue-200'
              else if (filter === 'In Staging') colorClass = 'bg-amber-100 text-amber-700 border-amber-200'
              else if (filter === 'Staged') colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'
              else if (filter === 'Sold') colorClass = 'bg-purple-100 text-purple-700 border-purple-200'
            }
            return (
              <button 
                key={filter}
                onClick={() => toggleFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${colorClass} hover:opacity-80`}
              >
                {isActive ? '✓ ' : ''}{filter}
              </button>
            )
          })}
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button 
            onClick={() => setActiveFilters(['Warehouse', 'In Staging', 'Staged', 'Sold'])}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Show All
          </button>
        </div>

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={11}
            onLoad={handleMapLoad}
            onIdle={updateVisibleLocations}
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
            {(selectedLocation ? [selectedLocation] : filteredLocations).map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                onClick={() => handleMarkerClick(loc)}
                icon={{
                  url: loc.is_warehouse 
                    ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    : loc.status === 'In Staging' ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
                    : loc.status === 'Sold' ? 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }}
              />
            ))}

            {routePlan && !directions && routeStops.length >= 2 && (
              <DirectionsService
                options={{
                  origin: { lat: routeStops[0].latitude, lng: routeStops[0].longitude },
                  destination: { lat: routeStops[routeStops.length - 1].latitude, lng: routeStops[routeStops.length - 1].longitude },
                  waypoints: routeStops.slice(1, -1).map(stop => ({ location: { lat: stop.latitude, lng: stop.longitude }, stopover: true })),
                  travelMode: google.maps.TravelMode.DRIVING
                }}
                callback={(result, status) => {
                  if (status === 'OK' && result) {
                    setDirections(result)
                  }
                }}
              />
            )}
            
            {directions && (
              <DirectionsRenderer 
                options={{
                  directions: directions,
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: '#4f46e5',
                    strokeWeight: 6,
                    strokeOpacity: 0.8
                  }
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500 animate-pulse font-semibold">Loading High-Res Map...</p>
          </div>
        )}
      </div>

      {/* Route Builder Drawer (Right side) */}
      <div className="w-[350px] h-full bg-white shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] flex flex-col z-10 shrink-0 border-l border-gray-200">
        <div className="p-6 bg-gray-900 text-white shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Route size={20} className="text-indigo-400" /> Active Route
          </h2>
          <p className="text-xs text-gray-400 mt-1">Select locations to dispatch trucks.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {routeStops.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm font-medium">
              <Route size={32} className="mx-auto mb-3 opacity-20" />
              No stops added to route yet.<br/>Click a map pin to start.
            </div>
          ) : (
            <div className="space-y-3">
              {routeStops.map((stop, idx) => (
                <div key={stop.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between relative hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{stop.name}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{stop.address}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveFromRoute(stop.id)} className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Action Area */}
        <div className="p-6 bg-white border-t border-gray-200 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          {routePlan ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 mb-4 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <Truck size={100} />
                </div>
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  ✨ Gemini AI Logistics
                </h3>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white/80 p-3 rounded-lg shadow-sm flex flex-col items-center justify-center border border-indigo-50 backdrop-blur-sm">
                    <Truck className="text-indigo-600 mb-1" size={20} />
                    <span className="text-[9px] text-gray-500 uppercase font-bold">Recommended</span>
                    <span className="font-bold text-gray-900 text-center text-xs mt-1">{routePlan.truck}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg shadow-sm flex flex-col items-center justify-center border border-indigo-50 backdrop-blur-sm">
                    <Users className="text-indigo-600 mb-1" size={20} />
                    <span className="text-[9px] text-gray-500 uppercase font-bold">Manpower</span>
                    <span className="font-bold text-gray-900 text-center text-xs mt-1">{routePlan.movers}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/80 p-3 rounded-lg shadow-sm flex flex-col items-center justify-center border border-indigo-50 backdrop-blur-sm">
                    <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Distance</span>
                    <span className="font-bold text-indigo-900 text-center text-sm">{routePlan.distance}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg shadow-sm flex flex-col items-center justify-center border border-indigo-50 backdrop-blur-sm">
                    <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Est. Time</span>
                    <span className="font-bold text-indigo-900 text-center text-sm">{routePlan.time}</span>
                  </div>
                </div>
                
                <p className="text-xs text-indigo-800 italic leading-relaxed font-medium bg-white/50 p-3 rounded-lg border border-indigo-50">
                  "{routePlan.reason}"
                </p>
              </div>

              <button 
                onClick={() => {
                  const link = `${window.location.origin}/operator?stops=${routeStops.map(s => s.id).join(',')}`
                  navigator.clipboard.writeText(link)
                  alert("Trip Link Copied! Ready to paste to the operator.")
                }}
                className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Copy Trip Link for Operator
              </button>
            </div>
          ) : (
            <button 
              onClick={handleGeneratePlan}
              disabled={routeStops.length < 2 || loadingPlan}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                routeStops.length < 2 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {loadingPlan ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Payload...
                </>
              ) : (
                <>✨ Generate AI Dispatch Plan</>
              )}
            </button>
          )}
          {routeStops.length < 2 && !routePlan && (
            <p className="text-center text-[10px] uppercase font-bold text-gray-400 mt-3">Requires 2+ stops for AI routing</p>
          )}
        </div>
      </div>
    </div>
  )
}
