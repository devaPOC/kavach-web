// This file contains data for location dropdowns used in the application
import { getCountryOptions, getNationalityOptions } from './countries-nationalities';

// Export comprehensive countries and nationalities from the new data file
export const countries = getCountryOptions();
export const nationalities = getNationalityOptions();

// Governorates in Oman
export const governorates = [
  { value: 'muscat', label: 'Muscat' },
  { value: 'dhofar', label: 'Dhofar' },
  { value: 'musandam', label: 'Musandam' },
  { value: 'buraimi', label: 'Al Buraimi' },
  { value: 'dakhiliyah', label: 'Ad Dakhiliyah' },
  { value: 'batinah-north', label: 'North Al Batinah' },
  { value: 'batinah-south', label: 'South Al Batinah' },
  { value: 'sharqiyah-north', label: 'North Ash Sharqiyah' },
  { value: 'sharqiyah-south', label: 'South Ash Sharqiyah' },
  { value: 'dhahirah', label: 'Adh Dhahirah' },
  { value: 'wusta', label: 'Al Wusta' }
];

// Wilayats by governorate
export const wilayats: Record<string, Array<{ value: string, label: string }>> = {
  'muscat': [
    { value: 'muscat', label: 'Muscat' },
    { value: 'muttrah', label: 'Muttrah' },
    { value: 'bawshar', label: 'Bawshar' },
    { value: 'seeb', label: 'Seeb' },
    { value: 'amarat', label: 'Al Amarat' },
    { value: 'quriyat', label: 'Quriyat' }
  ],
  'dhofar': [
    { value: 'salalah', label: 'Salalah' },
    { value: 'thumrait', label: 'Thumrait' },
    { value: 'taqah', label: 'Taqah' },
    { value: 'mirbat', label: 'Mirbat' },
    { value: 'sadah', label: 'Sadah' },
    { value: 'rakhyut', label: 'Rakhyut' },
    { value: 'dhalkut', label: 'Dhalkut' },
    { value: 'muqshin', label: 'Muqshin' },
    { value: 'shalim', label: 'Shalim and the Hallaniyat Islands' },
    { value: 'mazyounah', label: 'Mazyounah' }
  ],
  'musandam': [
    { value: 'khasab', label: 'Khasab' },
    { value: 'bukha', label: 'Bukha' },
    { value: 'dibba', label: 'Dibba' },
    { value: 'madha', label: 'Madha' }
  ],
  // Add other governorates with their wilayats as needed
  'buraimi': [
    { value: 'buraimi', label: 'Al Buraimi' },
    { value: 'mahdah', label: 'Mahdah' },
    { value: 'sinainah', label: 'As Sinainah' }
  ],
  'dakhiliyah': [
    { value: 'nizwa', label: 'Nizwa' },
    { value: 'bahla', label: 'Bahla' },
    { value: 'manah', label: 'Manah' },
    { value: 'adam', label: 'Adam' },
    { value: 'samail', label: 'Samail' },
    { value: 'bidbid', label: 'Bidbid' },
    { value: 'hamra', label: 'Al Hamra' },
    { value: 'izki', label: 'Izki' }
  ],
  'batinah-north': [
    { value: 'sohar', label: 'Sohar' },
    { value: 'shinas', label: 'Shinas' },
    { value: 'liwa', label: 'Liwa' },
    { value: 'saham', label: 'Saham' },
    { value: 'khaboura', label: 'Al Khaboura' },
    { value: 'suwaiq', label: 'As Suwaiq' }
  ]
};

// Helper function to get wilayat options based on selected governorate
export function getWilayatOptions(governorate: string | null | undefined) {
  if (!governorate) return [];
  return wilayats[governorate] || [];
}
