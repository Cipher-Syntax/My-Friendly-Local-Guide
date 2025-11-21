import { Map, Home, Users, BarChart3, AlertCircle } from 'lucide-react';

// Dashboard Stats
export const stats = [
  { value: '1,469', label: 'Total Tour Guides', icon: Map },
  { value: '1,503', label: 'Total Accommodation', icon: Home },
  { value: '5,489', label: 'Total Users', icon: Users },
];

// Agency Applications
export const agencies = [
  { id: 1, name: 'Tours & Travel Co.', email: 'contact@toursco.com', location: 'Manila', status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-10', documents: true },
  { id: 2, name: 'Adventure Quest', email: 'info@adventurequest.com', location: 'Cebu', status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-12', documents: true },
  { id: 3, name: 'Island Hoppers', email: 'hello@islandhoppers.com', location: 'Palawan', status: 'approved', rating: 4.8, tours: 45, joinDate: '2025-10-15', documents: true },
];

// Tour Guides Applications
export const tourGuides = [
  { id: 1, name: 'John Dubois', email: 'john@guides.com', specialty: 'Historical Tours', languages: ['English', 'French'], status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-11', verified: false, credentials: { certificate: true, residency: true, validId: true, nbiClearance: false } },
  { id: 2, name: 'Maria Santos', email: 'maria@guides.com', specialty: 'Art & Culture', languages: ['English', 'Italian'], status: 'pending', rating: 0, tours: 0, joinDate: '2025-11-13', verified: false, credentials: { certificate: true, residency: true, validId: true, nbiClearance: true } },
  { id: 3, name: 'Paolo Bubboni', email: 'paolo@guides.com', specialty: 'Food & Wine', languages: ['English', 'Italian'], status: 'approved', rating: 4.7, tours: 98, joinDate: '2025-09-20', verified: true, credentials: { certificate: true, residency: true, validId: true, nbiClearance: true } },
];

// Users Management
export const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', type: 'Tourist', joinDate: '2025-08-15', status: 'active', warnings: 0 },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', type: 'Guide', joinDate: '2025-07-20', status: 'active', warnings: 1 },
  { id: 3, name: 'Carol White', email: 'carol@example.com', type: 'Agency', joinDate: '2025-06-10', status: 'restricted', warnings: 2 },
  { id: 4, name: 'David Brown', email: 'david@example.com', type: 'Tourist', joinDate: '2025-09-05', status: 'active', warnings: 0 },
];

// Accommodations
export const accommodations = [
  { id: 1, name: 'Beachfront Resort', submittedBy: 'Tours & Travel Co.', location: 'Boracay', price: '₱5,000/night', rating: 4.5, images: 3, status: 'pending', description: 'Luxury beachfront resort with pool and spa' },
  { id: 2, name: 'Mountain Lodge', submittedBy: 'Adventure Quest', location: 'Tagaytay', price: '₱3,000/night', rating: 0, images: 5, status: 'pending', description: 'Cozy mountain lodge with fireplace' },
  { id: 3, name: 'City Hotel', submittedBy: 'Island Hoppers', location: 'Manila', price: '₱2,500/night', rating: 4.2, images: 4, status: 'approved', description: 'Modern city hotel near business district' },
];

// Reports
export const reports = [
  { id: 1, type: 'User', reportedUser: 'Bob Smith', reporter: 'John Doe', reason: 'Inappropriate behavior', status: 'pending', date: '2025-11-12', severity: 'medium' },
  { id: 2, type: 'Guide', reportedUser: 'Maria Santos', reporter: 'Alice Johnson', reason: 'Poor service quality', status: 'pending', date: '2025-11-11', severity: 'low' },
  { id: 3, type: 'Agency', reportedUser: 'Tours & Travel Co.', reporter: 'Admin', reason: 'Fraudulent activity', status: 'resolved', date: '2025-11-10', severity: 'high' },
];

// Content Management - Spots and Attractions
export const spotsAndAttractions = [
  { id: 1, name: 'Zamboanga City Historic District', postedBy: 'John Dubois', type: 'Guide', category: 'Historical', description: 'Colonial-era buildings and historical landmarks', images: 8, rating: 4.5, featured: true, status: 'published' },
  { id: 2, name: 'Boracay White Beach', postedBy: 'Tours & Travel Co.', type: 'Agency', category: 'Nature', description: 'Famous white sand beach with water activities', images: 12, rating: 4.8, featured: true, status: 'published' },
  { id: 3, name: 'Palawan Underground River', postedBy: 'Maria Santos', type: 'Guide', category: 'Adventure', description: 'UNESCO World Heritage Site with underground river', images: 15, rating: 4.9, featured: false, status: 'published' },
  { id: 4, name: 'Cebu Heritage Site', postedBy: 'Adventure Quest', type: 'Agency', category: 'Cultural', description: 'Ancient temples and cultural monuments', images: 6, rating: 4.3, featured: false, status: 'draft' },
];

// Recent Bookings
export const bookings = [
  { id: '23105', tourist: 'John Doe', guide: 'Justine Noong', date: '10/16/2025', status: 'Ongoing' },
  { id: '23104', tourist: 'Trixie Lore', guide: 'Francias Detore', date: '10/14/2025', status: 'Cancelled' },
  { id: '23103', tourist: 'Linz Smith', guide: 'Paulo Yowbank', date: '10/11/2025', status: 'Completed' },
];

export const getStatusColor = (status) => {
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
    case 'published':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'draft':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
};

export const getSeverityColor = (severity) => {
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
