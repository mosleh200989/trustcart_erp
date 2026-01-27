import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import { FaShoppingCart, FaBullseye, FaBoxOpen, FaLeaf, FaHeart, FaTruck, FaShieldAlt, FaUsers } from 'react-icons/fa';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <FaShoppingCart className="text-6xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About TrustCart</h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Pure Food for a Healthier Life
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">About Us</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* About TrustCart Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaShoppingCart />
                About TrustCart
              </h2>
            </div>
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
                <p className="text-xl font-medium text-gray-800 leading-relaxed">
                  TrustCart একটি বিশ্বস্ত অনলাইন গ্রোসারি ও ফুড প্রোডাক্ট প্ল্যাটফর্ম,
                  যার মূল লক্ষ্য হলো প্রতিটি পরিবারের কাছে <span className="text-orange-600 font-semibold">খাঁটি, নিরাপদ ও মানসম্মত পণ্য</span> পৌঁছে দেওয়া।
                </p>
                
                <p className="leading-relaxed">
                  আমরা বিশ্বাস করি—<strong>ভালো খাবার মানেই সুস্থ জীবন।</strong><br />
                  এই বিশ্বাস থেকেই TrustCart নিয়ে এসেছে খাঁটি মসলা, স্বাস্থ্যকর খাদ্যপণ্য,
                  নারিকেল তেল, সরিষার তেল এবং প্রয়োজনীয় ডেইলি গ্রোসারি।
                </p>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg my-6">
                  <p className="text-gray-800 leading-relaxed">
                    TrustCart সবসময় অগ্রাধিকার দেয়
                    <strong> পণ্যের গুণগত মান, সঠিক মূল্য এবং গ্রাহকের আস্থা।</strong><br />
                    প্রতিটি পণ্য নির্বাচন করা হয় যত্ন ও যাচাইয়ের মাধ্যমে,
                    যাতে আপনি পান নিশ্চিন্ত কেনাকাটার অভিজ্ঞতা।
                  </p>
                </div>

                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  আমাদের লক্ষ্য শুধু পণ্য বিক্রি নয়—<br />
                  বরং <span className="text-orange-600">একটি দীর্ঘমেয়াদি বিশ্বাসের সম্পর্ক</span> তৈরি করা।
                </p>
              </div>
            </div>
          </div>

          {/* Our Mission Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaBullseye />
                Our Mission
              </h2>
            </div>
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
                <p className="text-xl font-medium text-gray-800 leading-relaxed">
                  TrustCart–এর মিশন হলো প্রতিটি পরিবারের দৈনন্দিন জীবনে
                  <span className="text-green-600 font-semibold"> বিশ্বাসযোগ্য, খাঁটি ও স্বাস্থ্যসম্মত খাদ্যপণ্য</span> পৌঁছে দেওয়া।
                </p>

                <p className="leading-relaxed">
                  আমরা বিশ্বাস করি—<br />
                  <strong>খাবারের গুণগত মান সরাসরি মানুষের স্বাস্থ্যের সাথে জড়িত।</strong><br />
                  তাই TrustCart সবসময় অঙ্গীকারবদ্ধ—
                </p>

                <div className="grid md:grid-cols-2 gap-4 my-6">
                  <div className="flex items-start gap-3 bg-green-50 p-4 rounded-lg">
                    <FaLeaf className="text-green-500 text-xl mt-1 flex-shrink-0" />
                    <span className="text-gray-800">খাঁটি ও ভেজালমুক্ত মসলা সরবরাহে</span>
                  </div>
                  <div className="flex items-start gap-3 bg-green-50 p-4 rounded-lg">
                    <FaHeart className="text-green-500 text-xl mt-1 flex-shrink-0" />
                    <span className="text-gray-800">স্বাস্থ্যকর ও নিরাপদ খাদ্যপণ্য নিশ্চিত করতে</span>
                  </div>
                  <div className="flex items-start gap-3 bg-green-50 p-4 rounded-lg">
                    <FaShieldAlt className="text-green-500 text-xl mt-1 flex-shrink-0" />
                    <span className="text-gray-800">ন্যায্য মূল্যে মানসম্মত পণ্য দিতে</span>
                  </div>
                  <div className="flex items-start gap-3 bg-green-50 p-4 rounded-lg">
                    <FaUsers className="text-green-500 text-xl mt-1 flex-shrink-0" />
                    <span className="text-gray-800">গ্রাহকের আস্থা ও সন্তুষ্টিকে সর্বোচ্চ গুরুত্ব দিতে</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 rounded-xl my-6">
                  <p className="text-gray-800 leading-relaxed">
                    TrustCart শুধুমাত্র একটি অনলাইন শপ নয়—<br />
                    <strong>এটি একটি বিশ্বাসের নাম,</strong><br />
                    যেখানে প্রতিটি পণ্যের পেছনে থাকে যত্ন, দায়বদ্ধতা ও সততা।
                  </p>
                </div>

                <p className="text-lg font-medium text-gray-800 leading-relaxed text-center">
                  আমাদের লক্ষ্য হলো<br />
                  <span className="text-green-600 text-xl">একটি সুস্থ সমাজ গড়ে তোলা,</span><br />
                  যেখানে ভালো খাবার হবে সবার অধিকার।
                </p>

                <p className="text-center text-xl font-bold text-green-600 mt-6">
                  🌿 TrustCart – Pure Food for a Healthier Life
                </p>
              </div>
            </div>
          </div>

          {/* What We Offer Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FaBoxOpen />
                What We Offer
              </h2>
            </div>
            <div className="p-8">
              <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
                <p className="text-xl font-medium text-gray-800 leading-relaxed">
                  TrustCart আপনাদের জন্য নিয়ে এসেছে
                  দৈনন্দিন জীবনের প্রয়োজনীয় <span className="text-blue-600 font-semibold">খাঁটি, নিরাপদ ও স্বাস্থ্যসম্মত পণ্যের সম্পূর্ণ সমাধান।</span>
                </p>

                <p className="leading-relaxed">
                  আমরা প্রতিটি পণ্য নির্বাচন করি গুণগত মান, বিশুদ্ধতা ও পরিবারের সুস্থতাকে
                  সর্বোচ্চ অগ্রাধিকার দিয়ে।
                </p>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
                  {/* Premium Spices */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                      Premium Spices
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span> খাঁটি মরিচ গুঁড়া
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span> হলুদ গুঁড়া
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span> ধনিয়া গুঁড়া
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span> জিরা গুঁড়া
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-red-500">•</span> এলাচ
                      </li>
                    </ul>
                  </div>

                  {/* Pure & Natural Oils */}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
                      Pure & Natural Oils
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500">•</span> খাঁটি নারিকেল তেল
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-amber-500">•</span> বিশুদ্ধ সরিষার তেল
                      </li>
                    </ul>
                  </div>

                  {/* Healthy & Organic Food */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                      Healthy & Organic Food
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span> স্বাস্থ্যকর ও অর্গানিক খাদ্যপণ্য
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">•</span> কেমিক্যাল ও ভেজালমুক্ত খাবার
                      </li>
                    </ul>
                  </div>

                  {/* Daily Grocery Essentials */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center gap-2">
                      Daily Grocery Essentials
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-blue-500">•</span> পরিবারের দৈনন্দিন প্রয়োজনীয় গ্রোসারি পণ্য
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-blue-500">•</span> নিরাপদ প্যাকেজিং ও মান নিয়ন্ত্রণ
                      </li>
                    </ul>
                  </div>

                  {/* Combo & Family Packs */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
                      Combo & Family Packs
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-purple-500">•</span> ফ্যামিলি হেলথ কম্বো প্যাক
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-500">•</span> সাশ্রয়ী মূল্য ও বিশেষ অফার
                      </li>
                    </ul>
                  </div>

                  {/* Easy Online Shopping & Delivery */}
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-teal-700 mb-4 flex items-center gap-2">
                      Easy Online Shopping & Delivery
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-center gap-2">
                        <span className="text-teal-500">•</span> সহজ অনলাইন অর্ডার
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-teal-500">•</span> দ্রুত ও নিরাপদ হোম ডেলিভারি
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-6 rounded-xl text-center">
                  <p className="text-gray-800 leading-relaxed mb-4">
                    TrustCart সবসময় চেষ্টা করে<br />
                    আপনাকে দেওয়া প্রতিটি পণ্যে নিশ্চিত করতে<br />
                    <strong>বিশ্বাস, মান এবং স্বস্তি।</strong>
                  </p>
                  <p className="text-xl font-bold text-orange-600">
                    🌿 TrustCart – Everything Your Family Trusts
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                Contact Information
              </h2>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-3">🕐</div>
                  <h3 className="font-bold text-gray-800 mb-2">Office Hours</h3>
                  <p className="text-gray-600">8:00 AM to 12:00 AM</p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-3">📞</div>
                  <h3 className="font-bold text-gray-800 mb-2">Hotline</h3>
                  <p className="text-orange-600 font-semibold text-lg">09647248283</p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-3">✉️</div>
                  <h3 className="font-bold text-gray-800 mb-2">Email</h3>
                  <p className="text-gray-600">contact@trustcart.com.bd</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <ElectroFooter />
    </div>
  );
}
