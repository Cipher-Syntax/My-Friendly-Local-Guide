import React, { useState, useMemo } from 'react';
import { Search, Bell, Users, Map, Home, BarChart3, Settings, User, Check, X, AlertCircle, Eye, Trash2, Lock, AlertTriangle, Image as ImageIcon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [viewingCredentials, setViewingCredentials] = useState(null);
  const [newCategory, setNewCategory] = useState('');

  // Dashboard Stats
  const stats = [
    { value: '1,469', label: 'Total Tour Guides', icon: Map },
    { value: '1,503', label: 'Total Accommodation', icon: Home },
    { value: '5,489', label: 'Total Users', icon: Users },
  ];

  // Agency Applications
  const [agencies, setAgencies] = useState([
    { id: 1, name: 'Tours & Travel Co.', email: 'contact@toursco.com', location: 'Manila', status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-10', documents: true },
    { id: 2, name: 'Adventure Quest', email: 'info@adventurequest.com', location: 'Cebu', status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-12', documents: true },
    { id: 3, name: 'Island Hoppers', email: 'hello@islandhoppers.com', location: 'Palawan', status: 'approved', rating: 4.8, tours: 45, joinDate: '2025-10-15', documents: true },
  ]);

  // Tour Guides Applications
  const [tourGuides, setTourGuides] = useState([
    { id: 1, name: 'John Dubois', email: 'john@guides.com', specialty: 'Historical Tours', languages: ['English', 'French'], status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-11', verified: false, credentials: { certificate: true, residency: true, validId: true, nbiClearance: false } },
    { id: 2, name: 'Maria Santos', email: 'maria@guides.com', specialty: 'Art & Culture', languages: ['English', 'Italian'], status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-13', verified: false, credentials: { certificate: true, residency: true, validId: true, nbiClearance: true } },
    { id: 3, name: 'Paolo Bubboni', email: 'paolo@guides.com', specialty: 'Food & Wine', languages: ['English', 'Italian'], status: 'approved', rating: 4.7, tours: 98, joinDate: '2025-09-20', verified: true, credentials: { certificate: true, residency: true, validId: true, nbiClearance: true } },
  ]);

  // Users Management
  const [users, setUsers] = useState([
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', type: 'Tourist', joinDate: '2025-08-15', status: 'active', warnings: 0 },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', type: 'Guide', joinDate: '2025-07-20', status: 'active', warnings: 1 },
    { id: 3, name: 'Carol White', email: 'carol@example.com', type: 'Agency', joinDate: '2025-06-10', status: 'restricted', warnings: 2 },
    { id: 4, name: 'David Brown', email: 'david@example.com', type: 'Tourist', joinDate: '2025-09-05', status: 'active', warnings: 0 },
  ]);

  // Accommodations
  const [accommodations, setAccommodations] = useState([
    { id: 1, name: 'Beachfront Resort', submittedBy: 'Tours & Travel Co.', location: 'Boracay', price: '₱5,000/night', rating: 4.5, images: 3, status: 'pending', description: 'Luxury beachfront resort with pool and spa' },
    { id: 2, name: 'Mountain Lodge', submittedBy: 'Adventure Quest', location: 'Tagaytay', price: '₱3,000/night', rating: 0, images: 5, status: 'pending', description: 'Cozy mountain lodge with fireplace' },
    { id: 3, name: 'City Hotel', submittedBy: 'Island Hoppers', location: 'Manila', price: '₱2,500/night', rating: 4.2, images: 4, status: 'approved', description: 'Modern city hotel near business district' },
  ]);

  // Reports
  const [reports, setReports] = useState([
    { id: 1, type: 'User', reportedUser: 'Bob Smith', reporter: 'John Doe', reason: 'Inappropriate behavior', status: 'pending', date: '2025-11-12', severity: 'medium' },
    { id: 2, type: 'Guide', reportedUser: 'Maria Santos', reporter: 'Alice Johnson', reason: 'Poor service quality', status: 'pending', date: '2025-11-11', severity: 'low' },
    { id: 3, type: 'Agency', reportedUser: 'Tours & Travel Co.', reporter: 'Admin', reason: 'Fraudulent activity', status: 'resolved', date: '2025-11-10', severity: 'high' },
  ]);

  // Content Management - Spots and Attractions
  const [spotsAndAttractions, setSpotsAndAttractions] = useState([
    { id: 1, name: 'Zamboanga City Historic District', postedBy: 'John Dubois', type: 'Guide', category: 'Historical', description: 'Colonial-era buildings and historical landmarks', images: 8, rating: 4.5, featured: true, status: 'published' },
    { id: 2, name: 'Boracay White Beach', postedBy: 'Tours & Travel Co.', type: 'Agency', category: 'Nature', description: 'Famous white sand beach with water activities', images: 12, rating: 4.8, featured: true, status: 'published' },
    { id: 3, name: 'Palawan Underground River', postedBy: 'Maria Santos', type: 'Guide', category: 'Adventure', description: 'UNESCO World Heritage Site with underground river', images: 15, rating: 4.9, featured: false, status: 'published' },
    { id: 4, name: 'Cebu Heritage Site', postedBy: 'Adventure Quest', type: 'Agency', category: 'Cultural', description: 'Ancient temples and cultural monuments', images: 6, rating: 4.3, featured: false, status: 'draft' },
  ]);

  const [editingSpot, setEditingSpot] = useState(null);
  const [isEditSpotModalOpen, setIsEditSpotModalOpen] = useState(false);
  const [isViewImagesModalOpen, setIsViewImagesModalOpen] = useState(false);
  const [viewingSpotImages, setViewingSpotImages] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, itemId: null, itemType: null, itemName: '' });
  const [viewingCredentialImage, setViewingCredentialImage] = useState(null);
  const [isViewCredentialImageModalOpen, setIsViewCredentialImageModalOpen] = useState(false);

  // Recent Bookings
  const bookings = [
    { id: '23105', tourist: 'John Doe', guide: 'Justine Noong', date: '10/16/2025', status: 'Ongoing' },
    { id: '23104', tourist: 'Trixie Lore', guide: 'Francias Detore', date: '10/14/2025', status: 'Cancelled' },
    { id: '23103', tourist: 'Linz Smith', guide: 'Paulo Yowbank', date: '10/11/2025', status: 'Completed' },
  ];

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'agency', icon: Map, label: 'Agency' },
    { id: 'guides', icon: Users, label: 'Tour Guides' },
    { id: 'users', icon: User, label: 'User Management' },
    { id: 'content', icon: Home, label: 'Content Management' },
    { id: 'accommodation', icon: Home, label: 'Accommodation' },
    { id: 'reports', icon: AlertCircle, label: 'Report & Analysis' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ongoing':
      case 'active':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Cancelled':
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Completed':
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'restricted':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-400';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'low':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  // Filter functions
  const filteredAgencies = useMemo(() =>
    agencies.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [agencies, searchTerm]
  );

  const filteredGuides = useMemo(() =>
    tourGuides.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [tourGuides, searchTerm]
  );

  const filteredUsers = useMemo(() =>
    users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [users, searchTerm]
  );

  const filteredAccommodations = useMemo(() =>
    accommodations.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [accommodations, searchTerm]
  );

  // Handler functions
  const reviewApplication = (item, type) => {
    setReviewingItem({ ...item, type });
    setIsReviewModalOpen(true);
  };

  const approveApplication = () => {
    if (reviewingItem.type === 'agency') {
      setAgencies(agencies.map(a => a.id === reviewingItem.id ? { ...a, status: 'approved' } : a));
    } else if (reviewingItem.type === 'guide') {
      setTourGuides(tourGuides.map(g => g.id === reviewingItem.id ? { ...g, status: 'approved', verified: true } : g));
    }
    setIsReviewModalOpen(false);
  };

  const declineApplication = () => {
    if (reviewingItem.type === 'agency') {
      setAgencies(agencies.filter(a => a.id !== reviewingItem.id));
    } else if (reviewingItem.type === 'guide') {
      setTourGuides(tourGuides.filter(g => g.id !== reviewingItem.id));
    }
    setIsReviewModalOpen(false);
  };

  const restrictUser = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: u.status === 'restricted' ? 'active' : 'restricted' } : u));
  };

  const warnUser = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, warnings: u.warnings + 1 } : u));
  };

  const deleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const resolveReport = (reportId) => {
    setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
  };

  const blockUser = (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setUsers(users.map(u => u.name === report.reportedUser ? { ...u, status: 'restricted' } : u));
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    }
  };

  const viewAccommodationImages = (accommodation) => {
    setSelectedImage(accommodation);
    setIsImageModalOpen(true);
  };

  const viewGuideCredentials = (guide) => {
    setViewingCredentials(guide);
    setIsCredentialsModalOpen(true);
  };

  const editAccommodation = (accommodation) => {
    setEditingSpot({ ...accommodation });
    setIsEditSpotModalOpen(true);
  };

  const saveAccommodationChanges = () => {
    setSpotsAndAttractions(spotsAndAttractions.map(s => 
      s.id === editingSpot.id ? editingSpot : s
    ));
    setIsEditSpotModalOpen(false);
    setEditingSpot(null);
  };

  const deleteAccommodation = (accommodationId, name) => {
    setDeleteConfirmation({ isOpen: true, itemId: accommodationId, itemType: 'spot', itemName: name });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.itemType === 'spot') {
      setSpotsAndAttractions(spotsAndAttractions.filter(s => s.id !== deleteConfirmation.itemId));
    }
    setDeleteConfirmation({ isOpen: false, itemId: null, itemType: null, itemName: '' });
  };

  const toggleFeatured = (accommodationId) => {
    setSpotsAndAttractions(spotsAndAttractions.map(s => 
      s.id === accommodationId ? { ...s, featured: !s.featured } : s
    ));
  };

  const viewSpotImages = (spot) => {
    setViewingSpotImages(spot);
    setIsViewImagesModalOpen(true);
  };

  const viewCredentialImage = (credentialType, guideName) => {
    setViewingCredentialImage({ type: credentialType, guideName });
    setIsViewCredentialImageModalOpen(true);
  };

  const handleSignOut = () => {
    navigate('/admin-signin');
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-xl font-bold text-white">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">System Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Admin</p>
              <p className="text-slate-400 text-xs">admin@system.com</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-500/30"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
          <div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
            </div>
            <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                  {activeTab === 'dashboard' && <BarChart3 className="w-8 h-8 text-white" />}
                  {activeTab === 'agency' && <Map className="w-8 h-8 text-white" />}
                  {activeTab === 'guides' && <Users className="w-8 h-8 text-white" />}
                  {activeTab === 'users' && <User className="w-8 h-8 text-white" />}
                  {activeTab === 'content' && <Home className="w-8 h-8 text-white" />}
                  {activeTab === 'accommodation' && <Home className="w-8 h-8 text-white" />}
                  {activeTab === 'reports' && <AlertCircle className="w-8 h-8 text-white" />}
                  {activeTab === 'settings' && <Settings className="w-8 h-8 text-white" />}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {activeTab === 'dashboard' && 'Dashboard Overview'}
                    {activeTab === 'agency' && 'Agency Management'}
                    {activeTab === 'guides' && 'Tour Guides Management'}
                    {activeTab === 'users' && 'User Management'}
                    {activeTab === 'content' && 'Content Management'}
                    {activeTab === 'accommodation' && 'Accommodation Management'}
                    {activeTab === 'reports' && 'Reports & Analysis'}
                    {activeTab === 'settings' && 'Settings'}
                  </h2>
                  <p className="text-cyan-100 mt-1">
                    {activeTab === 'dashboard' && 'System overview and key statistics'}
                    {activeTab === 'agency' && 'Review and manage agency applications'}
                    {activeTab === 'guides' && 'Review and manage tour guide applications'}
                    {activeTab === 'users' && 'Manage users, restrictions, and warnings'}
                    {activeTab === 'content' && 'Manage content categories and locations'}
                    {activeTab === 'accommodation' && 'Review accommodation submissions'}
                    {activeTab === 'reports' && 'View and manage user reports'}
                    {activeTab === 'settings' && 'System configuration and preferences'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
                      </div>
                      <stat.icon className="w-12 h-12 text-cyan-400 opacity-20" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Applications & Reports Status</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Pending Agencies</p>
                        <p className="text-white font-semibold">{agencies.filter(a => a.status === 'pending').length}/3</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${(agencies.filter(a => a.status === 'pending').length / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Pending Tour Guides</p>
                        <p className="text-white font-semibold">{tourGuides.filter(g => g.status === 'pending').length}/3</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          style={{ width: `${(tourGuides.filter(g => g.status === 'pending').length / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Pending Reports</p>
                        <p className="text-white font-semibold">{reports.filter(r => r.status === 'pending').length}/3</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-amber-500 h-2 rounded-full"
                          style={{ width: `${(reports.filter(r => r.status === 'pending').length / 3) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Restricted Users</p>
                        <p className="text-white font-semibold">{users.filter(u => u.status === 'restricted').length}/4</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${(users.filter(u => u.status === 'restricted').length / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 ">Content Management Overview</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Featured Spots</p>
                        <p className="text-white font-semibold">{spotsAndAttractions.filter(s => s.featured).length}/{spotsAndAttractions.length}</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                          style={{ width: `${(spotsAndAttractions.filter(s => s.featured).length / spotsAndAttractions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Published Spots</p>
                        <p className="text-white font-semibold">{spotsAndAttractions.filter(s => s.status === 'published').length}/{spotsAndAttractions.length}</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${(spotsAndAttractions.filter(s => s.status === 'published').length / spotsAndAttractions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Approved Agencies</p>
                        <p className="text-white font-semibold">{agencies.filter(a => a.status === 'approved').length}/{agencies.length}</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${(agencies.filter(a => a.status === 'approved').length / agencies.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-slate-400 text-sm">Verified Guides</p>
                        <p className="text-white font-semibold">{tourGuides.filter(g => g.verified).length}/{tourGuides.length}</p>
                      </div>
                      <div className="w-full bg-slate-900/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full"
                          style={{ width: `${(tourGuides.filter(g => g.verified).length / tourGuides.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">User Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Total Users</p>
                      <p className="text-white font-bold text-lg">{users.length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Active Users</p>
                      <p className="text-green-400 font-bold text-lg">{users.filter(u => u.status === 'active').length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Restricted Users</p>
                      <p className="text-red-400 font-bold text-lg">{users.filter(u => u.status === 'restricted').length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Users with Warnings</p>
                      <p className="text-yellow-400 font-bold text-lg">{users.filter(u => u.warnings > 0).length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Applications</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Total Agencies</p>
                      <p className="text-white font-bold text-lg">{agencies.length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Approved Agencies</p>
                      <p className="text-green-400 font-bold text-lg">{agencies.filter(a => a.status === 'approved').length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Pending Agencies</p>
                      <p className="text-yellow-400 font-bold text-lg">{agencies.filter(a => a.status === 'pending').length}</p>
                    </div>
                    <div className="border-t border-slate-700/50 pt-3 mt-3">
                      <p className="text-slate-400 text-sm">Total Tour Guides</p>
                      <p className="text-white font-bold text-lg mt-1">{tourGuides.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4">Content Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Spots & Attractions</p>
                      <p className="text-white font-bold text-lg">{spotsAndAttractions.length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Featured Content</p>
                      <p className="text-amber-400 font-bold text-lg">{spotsAndAttractions.filter(s => s.featured).length}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 text-sm">Pending Reports</p>
                      <p className="text-red-400 font-bold text-lg">{reports.filter(r => r.status === 'pending').length}</p>
                    </div>
                    <div className="border-t border-slate-700/50 pt-3 mt-3">
                      <p className="text-slate-400 text-sm">Resolved Reports</p>
                      <p className="text-green-400 font-bold text-lg">{reports.filter(r => r.status === 'resolved').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Agency Management */}
          {activeTab === 'agency' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search agencies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredAgencies.map(agency => (
                  <div key={agency.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{agency.name}</h3>
                        <p className="text-slate-400 text-sm">{agency.email}</p>
                        <p className="text-slate-400 text-sm">Location: {agency.location}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(agency.status)}`}>
                        {agency.status}
                      </span>
                    </div>
                    {agency.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => reviewApplication(agency, 'agency')}
                          className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tour Guides Management */}
          {activeTab === 'guides' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tour guides..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredGuides.map(guide => (
                  <div key={guide.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{guide.name}</h3>
                        <p className="text-slate-400 text-sm">{guide.email}</p>
                        <p className="text-slate-400 text-sm">Specialty: {guide.specialty}</p>
                        <p className="text-slate-400 text-sm">Languages: {guide.languages.join(', ')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(guide.status)}`}>
                        {guide.status}
                      </span>
                    </div>
                    {guide.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => viewGuideCredentials(guide)}
                          className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Credentials
                        </button>
                        <button
                          onClick={() => reviewApplication(guide, 'guide')}
                          className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{user.name}</h3>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <p className="text-slate-400 text-sm">Type: {user.type}</p>
                        <p className="text-slate-400 text-sm">Warnings: {user.warnings}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => warnUser(user.id)}
                        className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Warn
                      </button>
                      <button
                        onClick={() => restrictUser(user.id)}
                        className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        {user.status === 'restricted' ? 'Unrestrict' : 'Restrict'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accommodation Management */}
          {activeTab === 'accommodation' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search accommodations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredAccommodations.map(accommodation => (
                  <div key={accommodation.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{accommodation.name}</h3>
                        <p className="text-slate-400 text-sm">{accommodation.description}</p>
                        <p className="text-slate-400 text-sm">Submitted by: {accommodation.submittedBy}</p>
                        <p className="text-slate-400 text-sm">Location: {accommodation.location} | Price: {accommodation.price}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(accommodation.status)}`}>
                        {accommodation.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => viewAccommodationImages(accommodation)}
                        className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        View Images ({accommodation.images})
                      </button>
                      {accommodation.status === 'pending' && (
                        <>
                          <button className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports & Analysis */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">Report on {report.reportedUser}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(report.severity)}`}>
                            {report.severity}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">Type: {report.type}</p>
                        <p className="text-slate-400 text-sm">Reason: {report.reason}</p>
                        <p className="text-slate-400 text-sm">Reported by: {report.reporter}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => resolveReport(report.id)}
                          className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => blockUser(report.id)}
                          className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                          Block User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Management */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search spots and attractions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {spotsAndAttractions.map(spot => (
                  <div key={spot.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold text-lg">{spot.name}</h3>
                          {spot.featured && (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                              ★ Featured
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm">Posted by: {spot.postedBy} ({spot.type})</p>
                        <p className="text-slate-400 text-sm">Category: {spot.category}</p>
                        <p className="text-slate-400 text-sm">{spot.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          spot.status === 'published' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {spot.status}
                        </span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <span>★</span>
                          <span className="text-white font-semibold">{spot.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-slate-400">Images</p>
                        <p className="text-white font-medium">{spot.images} uploaded</p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <p className="text-slate-400">Type</p>
                        <p className="text-white font-medium">{spot.type}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => viewSpotImages(spot)}
                        className="flex-1 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Images ({spot.images})
                      </button>
                      <button
                        onClick={() => editAccommodation(spot)}
                        className="flex-1 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleFeatured(spot.id)}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          spot.featured
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                            : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {spot.featured ? '★ Featured' : '☆ Feature'}
                      </button>
                      <button
                        onClick={() => deleteAccommodation(spot.id, spot.name)}
                        className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-white text-lg font-semibold mb-4">Admin Profile</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Full Name</label>
                      <input
                        type="text"
                        placeholder="Admin Name"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="admin@system.com"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-white text-lg font-semibold mb-4">System Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Platform Name</label>
                    <input
                      type="text"
                      placeholder="My Friendly Local Guide"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Support Email</label>
                    <input
                      type="email"
                      placeholder="support@system.com"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Support Phone</label>
                    <input
                      type="tel"
                      placeholder="+63 (0) 900-000-0000"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-white text-lg font-semibold mb-4">Content Moderation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Max Warnings Before Auto-Restriction</label>
                    <input
                      type="number"
                      placeholder="3"
                      min="1"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Auto-Approve Accommodations After (days)</label>
                    <input
                      type="number"
                      placeholder="7"
                      min="1"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Minimum Guide Rating to Post</label>
                    <input
                      type="number"
                      placeholder="3.5"
                      min="0"
                      step="0.1"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-white text-lg font-semibold mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
                    <div className="flex-1">
                      <label className="text-white text-sm font-medium block">Email on New Applications</label>
                      <p className="text-slate-400 text-xs">Receive emails when agencies/guides apply</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
                    <div className="flex-1">
                      <label className="text-white text-sm font-medium block">Email on New Reports</label>
                      <p className="text-slate-400 text-xs">Receive emails when users are reported</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
                    <div className="flex-1">
                      <label className="text-white text-sm font-medium block">Email on User Restrictions</label>
                      <p className="text-slate-400 text-xs">Receive emails when users are restricted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
                    <div className="flex-1">
                      <label className="text-white text-sm font-medium block">Email on Content Violations</label>
                      <p className="text-slate-400 text-xs">Receive emails on policy violations</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-white text-lg font-semibold mb-4">Security & Privacy</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
                  Reset to Defaults
                </button>
                <button className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium">
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Application Modal */}
      {isReviewModalOpen && reviewingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white">Review Application</h3>
            </div>

            <div className="px-6 py-6 space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Name</p>
                <p className="text-white font-medium">{reviewingItem.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-white font-medium">{reviewingItem.email}</p>
              </div>
              {reviewingItem.type === 'agency' && (
                <div>
                  <p className="text-slate-400 text-sm">Location</p>
                  <p className="text-white font-medium">{reviewingItem.location}</p>
                </div>
              )}
              {reviewingItem.type === 'guide' && (
                <>
                  <div>
                    <p className="text-slate-400 text-sm">Specialty</p>
                    <p className="text-white font-medium">{reviewingItem.specialty}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Languages</p>
                    <p className="text-white font-medium">{reviewingItem.languages.join(', ')}</p>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={declineApplication}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={approveApplication}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image View Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{selectedImage.name} - Images</h3>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-400 mb-4">Total Images: {selectedImage.images}</p>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: selectedImage.images }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-slate-900/50 border border-slate-700/50 rounded-lg flex items-center justify-center"
                  >
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Credentials Modal */}
      {isCredentialsModalOpen && viewingCredentials && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{viewingCredentials.name} - Credentials</h3>
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-400 text-sm mb-6">Guide credentials verification documents</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">Tour Guide Certificate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewingCredentials.credentials.certificate ? (
                      <>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Submitted
                        </span>
                        <button 
                          onClick={() => viewCredentialImage('certificate', viewingCredentials.name)}
                          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">Proof of Residency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewingCredentials.credentials.residency ? (
                      <>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Submitted
                        </span>
                        <button 
                          onClick={() => viewCredentialImage('residency', viewingCredentials.name)}
                          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">Valid ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewingCredentials.credentials.validId ? (
                      <>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Submitted
                        </span>
                        <button 
                          onClick={() => viewCredentialImage('validId', viewingCredentials.name)}
                          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">NBI Clearance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewingCredentials.credentials.nbiClearance ? (
                      <>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Submitted
                        </span>
                        <button 
                          onClick={() => viewCredentialImage('nbiClearance', viewingCredentials.name)}
                          className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium flex items-center gap-1">
                        <X className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Spot Images Modal */}
      {isViewImagesModalOpen && viewingSpotImages && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{viewingSpotImages.name} - Images</h3>
              <button
                onClick={() => setIsViewImagesModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-400 mb-4 text-sm">Total Images: {viewingSpotImages.images}</p>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: viewingSpotImages.images }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-slate-900/50 border border-slate-700/50 rounded-lg flex items-center justify-center hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setIsViewImagesModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Accommodation Modal */}
      {isEditSpotModalOpen && editingSpot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-800">
              <h3 className="text-xl font-bold text-white">Edit Spot & Attraction</h3>
              <button
                onClick={() => setIsEditSpotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Spot / Attraction Name</label>
                <input
                  type="text"
                  value={editingSpot.name}
                  onChange={(e) => setEditingSpot({ ...editingSpot, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editingSpot.description}
                  onChange={(e) => setEditingSpot({ ...editingSpot, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Category</label>
                  <input
                    type="text"
                    value={editingSpot.category}
                    onChange={(e) => setEditingSpot({ ...editingSpot, category: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={editingSpot.rating}
                    onChange={(e) => setEditingSpot({ ...editingSpot, rating: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Status</label>
                  <select
                    value={editingSpot.status}
                    onChange={(e) => setEditingSpot({ ...editingSpot, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Number of Images</label>
                  <input
                    type="number"
                    value={editingSpot.images}
                    onChange={(e) => setEditingSpot({ ...editingSpot, images: parseInt(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="bg-slate-900/30 border border-slate-700/30 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Posted by: <span className="text-white font-medium">{editingSpot.postedBy}</span></p>
                <p className="text-slate-400 text-sm">Type: <span className="text-white font-medium">{editingSpot.type}</span></p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 sticky bottom-0 bg-slate-800">
              <button
                onClick={() => setIsEditSpotModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAccommodationChanges}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Credential Image Modal */}
      {isViewCredentialImageModalOpen && viewingCredentialImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {viewingCredentialImage.type === 'certificate' && 'Tour Guide Certificate'}
                {viewingCredentialImage.type === 'residency' && 'Proof of Residency'}
                {viewingCredentialImage.type === 'validId' && 'Valid ID'}
                {viewingCredentialImage.type === 'nbiClearance' && 'NBI Clearance'}
              </h3>
              <button
                onClick={() => setIsViewCredentialImageModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-400 text-sm mb-4">Submitted by: {viewingCredentialImage.guideName}</p>
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-8 flex items-center justify-center min-h-96">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Credential image placeholder</p>
                  <p className="text-slate-500 text-sm mt-2">
                    {viewingCredentialImage.type === 'certificate' && 'Tour guide certificate document'}
                    {viewingCredentialImage.type === 'residency' && 'Proof of residency document'}
                    {viewingCredentialImage.type === 'validId' && 'Valid government ID document'}
                    {viewingCredentialImage.type === 'nbiClearance' && 'NBI clearance certificate'}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setIsViewCredentialImageModalOpen(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Delete Confirmation</h3>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-400 mb-2">Are you sure you want to delete this item?</p>
              <p className="text-white font-semibold text-lg">"{deleteConfirmation.itemName}"</p>
              <p className="text-slate-400 text-sm mt-3">This action cannot be undone.</p>
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, itemId: null, itemType: null, itemName: '' })}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}