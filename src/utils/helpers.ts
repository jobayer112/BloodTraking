import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null) {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleDateString();
}

export function canDonate(lastDonationDate: string | null): boolean {
  if (!lastDonationDate) return true;
  const lastDate = new Date(lastDonationDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 90;
}

export const DIVISIONS = [
  "Barishal", "Chattogram", "Dhaka", "Khulna", "Rajshahi", "Rangpur", "Mymensingh", "Sylhet"
];

export const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachari", "Lakshmipur", "Noakhali", "Rangamati"],
  "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  "Khulna": ["Bagerhat", "Chuadanga", "Jessore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  "Rajshahi": ["Bogra", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj"],
  "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
  "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"]
};

export const ALL_DISTRICTS = Object.values(DISTRICTS_BY_DIVISION).flat().sort();

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function getBadge(donationCount: number) {
  if (donationCount >= 20) return { name: "Platinum Donor", icon: "💎", color: "text-blue-400" };
  if (donationCount >= 10) return { name: "Gold Donor", icon: "🥇", color: "text-amber-400" };
  if (donationCount >= 5) return { name: "Silver Donor", icon: "🥈", color: "text-zinc-400" };
  if (donationCount >= 1) return { name: "Bronze Donor", icon: "🥉", color: "text-orange-400" };
  return null;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
