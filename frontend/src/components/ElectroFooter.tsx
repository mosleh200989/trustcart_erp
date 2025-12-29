import Link from 'next/link';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

export default function ElectroFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Newsletter */}
      <div className="bg-gray-800 py-8">
        <div className="container mx-auto px-36">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Sign Up for Newsletter</h3>
              <p className="text-gray-400">Get all the latest deals and offers</p>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-3 w-96 rounded-l-full focus:outline-none text-gray-900"
              />
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-r-full font-semibold transition">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-36 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h4 className="text-xl font-bold text-white mb-4">About TrustCart</h4>
            <p className="text-sm mb-4">
              Your trusted online shop for premium quality products. We deliver excellence with every order.
            </p>
            <div className="flex gap-3">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" 
                 className="bg-gray-800 hover:bg-orange-500 p-2 rounded-full transition">
                <FaFacebook size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 p-2 rounded-full transition">
                <FaTwitter size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 p-2 rounded-full transition">
                <FaInstagram size={18} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 p-2 rounded-full transition">
                <FaYoutube size={18} />
              </a>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-xl font-bold text-white mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-orange-400 transition">Contact Us</Link></li>
              <li><Link href="/shipping" className="hover:text-orange-400 transition">Shipping Policy</Link></li>
              <li><Link href="/returns" className="hover:text-orange-400 transition">Returns & Refunds</Link></li>
              <li><Link href="/faq" className="hover:text-orange-400 transition">FAQ</Link></li>
              <li><Link href="/track-order" className="hover:text-orange-400 transition">Track Order</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-orange-400 transition">About Us</Link></li>
              <li><Link href="/products" className="hover:text-orange-400 transition">Shop</Link></li>
              <li><Link href="/blog" className="hover:text-orange-400 transition">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-orange-400 transition">Careers</Link></li>
              <li><Link href="/privacy" className="hover:text-orange-400 transition">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-bold text-white mb-4">Contact Info</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-orange-500 mt-1" />
                <span>123 Street Name, Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="text-orange-500" />
                <span>+880 1707-653536</span>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="text-orange-500" />
                <span>support@trustcart.com</span>
              </li>
            </ul>
            <div className="mt-4">
              <p className="text-xs mb-2">We Accept:</p>
              <div className="flex gap-2">
                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-gray-900">VISA</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-gray-900">MASTER</div>
                <div className="bg-white px-2 py-1 rounded text-xs font-bold text-orange-500">bKash</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-950 py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-sm">
            <p>© 2024 TrustCart. All Rights Reserved.</p>
            <p>
              Designed by <span className="text-orange-500 font-semibold">TrustCart Team</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
