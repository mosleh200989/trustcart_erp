export interface BangladeshDistrict {
  en: string;
  bn: string;
}

export const BANGLADESH_DISTRICTS: BangladeshDistrict[] = [
  { en: 'Bagerhat', bn: 'বাগেরহাট' },
  { en: 'Bandarban', bn: 'বান্দরবান' },
  { en: 'Barguna', bn: 'বরগুনা' },
  { en: 'Barishal', bn: 'বরিশাল' },
  { en: 'Bhola', bn: 'ভোলা' },
  { en: 'Bogura', bn: 'বগুড়া' },
  { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া' },
  { en: 'Chandpur', bn: 'চাঁদপুর' },
  { en: 'Chapai Nawabganj', bn: 'চাঁপাইনবাবগঞ্জ' },
  { en: 'Chattogram', bn: 'চট্টগ্রাম' },
  { en: 'Chuadanga', bn: 'চুয়াডাঙ্গা' },
  { en: "Cox's Bazar", bn: 'কক্সবাজার' },
  { en: 'Cumilla', bn: 'কুমিল্লা' },
  { en: 'Dhaka', bn: 'ঢাকা' },
  { en: 'Dinajpur', bn: 'দিনাজপুর' },
  { en: 'Faridpur', bn: 'ফরিদপুর' },
  { en: 'Feni', bn: 'ফেনী' },
  { en: 'Gaibandha', bn: 'গাইবান্ধা' },
  { en: 'Gazipur', bn: 'গাজীপুর' },
  { en: 'Gopalganj', bn: 'গোপালগঞ্জ' },
  { en: 'Habiganj', bn: 'হবিগঞ্জ' },
  { en: 'Jamalpur', bn: 'জামালপুর' },
  { en: 'Jashore', bn: 'যশোর' },
  { en: 'Jhalokathi', bn: 'ঝালকাঠি' },
  { en: 'Jhenaidah', bn: 'ঝিনাইদহ' },
  { en: 'Joypurhat', bn: 'জয়পুরহাট' },
  { en: 'Khagrachhari', bn: 'খাগড়াছড়ি' },
  { en: 'Khulna', bn: 'খুলনা' },
  { en: 'Kishoreganj', bn: 'কিশোরগঞ্জ' },
  { en: 'Kurigram', bn: 'কুড়িগ্রাম' },
  { en: 'Kushtia', bn: 'কুষ্টিয়া' },
  { en: 'Lakshmipur', bn: 'লক্ষ্মীপুর' },
  { en: 'Lalmonirhat', bn: 'লালমনিরহাট' },
  { en: 'Madaripur', bn: 'মাদারীপুর' },
  { en: 'Magura', bn: 'মাগুরা' },
  { en: 'Manikganj', bn: 'মানিকগঞ্জ' },
  { en: 'Meherpur', bn: 'মেহেরপুর' },
  { en: 'Moulvibazar', bn: 'মৌলভীবাজার' },
  { en: 'Munshiganj', bn: 'মুন্সীগঞ্জ' },
  { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  { en: 'Naogaon', bn: 'নওগাঁ' },
  { en: 'Narail', bn: 'নড়াইল' },
  { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' },
  { en: 'Narsingdi', bn: 'নরসিংদী' },
  { en: 'Natore', bn: 'নাটোর' },
  { en: 'Netrokona', bn: 'নেত্রকোনা' },
  { en: 'Nilphamari', bn: 'নীলফামারী' },
  { en: 'Noakhali', bn: 'নোয়াখালী' },
  { en: 'Pabna', bn: 'পাবনা' },
  { en: 'Panchagarh', bn: 'পঞ্চগড়' },
  { en: 'Patuakhali', bn: 'পটুয়াখালী' },
  { en: 'Pirojpur', bn: 'পিরোজপুর' },
  { en: 'Rajbari', bn: 'রাজবাড়ী' },
  { en: 'Rajshahi', bn: 'রাজশাহী' },
  { en: 'Rangamati', bn: 'রাঙ্গামাটি' },
  { en: 'Rangpur', bn: 'রংপুর' },
  { en: 'Satkhira', bn: 'সাতক্ষীরা' },
  { en: 'Shariatpur', bn: 'শরীয়তপুর' },
  { en: 'Sherpur', bn: 'শেরপুর' },
  { en: 'Sirajganj', bn: 'সিরাজগঞ্জ' },
  { en: 'Sunamganj', bn: 'সুনামগঞ্জ' },
  { en: 'Sylhet', bn: 'সিলেট' },
  { en: 'Tangail', bn: 'টাঙ্গাইল' },
  { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও' },
];

const DISTRICT_SEARCH_ALIASES: Record<string, string[]> = {
  Barishal: ['বরিশাল', 'বারিশাল'],
  Bogura: ['বগুড়া', 'বগুড়া', 'বগুরা'],
  ChapaiNawabganj: ['চাঁপাইনবাবগঞ্জ', 'চাপাইনবাবগঞ্জ', 'চাঁপাই নবাবগঞ্জ'],
  Chattogram: ['চট্টগ্রাম', 'চট্রগ্রাম', 'চিটাগাং', 'Chittagong'],
  CoxsBazar: ['কক্সবাজার', 'কক্স বাজার', 'Cox Bazar', 'Coxsbazar'],
  Cumilla: ['কুমিল্লা', 'কুমিলা', 'Comilla'],
  Jashore: ['যশোর', 'যশোর', 'জেসোর', 'Jessore'],
  Moulvibazar: ['মৌলভীবাজার', 'মৌলভি বাজার'],
  Satkhira: ['সাতক্ষীরা', 'সাতখীরা', 'সাতখিরা', 'সাতক্ষিরা', 'সাত'],
};

export const normalizeDistrictText = (value: string) =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u09bc]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();

export const districtLabel = (district: BangladeshDistrict) => `${district.en} - ${district.bn}`;

export const getDistrictSearchValues = (district: BangladeshDistrict) => {
  const aliasKey = district.en.replace(/[^A-Za-z]/g, '');
  return [
    district.en,
    district.bn,
    districtLabel(district),
    ...(DISTRICT_SEARCH_ALIASES[aliasKey] || []),
  ].map(normalizeDistrictText);
};

export const findDistrictInText = (value: string) => {
  const normalizedValue = normalizeDistrictText(value);
  if (!normalizedValue) return null;

  return (
    BANGLADESH_DISTRICTS.find((district) =>
      getDistrictSearchValues(district).some(
        (searchValue) => searchValue && normalizedValue.includes(searchValue),
      ),
    ) || null
  );
};

export const isDhakaDistrictText = (value: string) => {
  const normalizedValue = normalizeDistrictText(value);
  return normalizedValue.includes('dhaka') || normalizedValue.includes(normalizeDistrictText('ঢাকা'));
};
