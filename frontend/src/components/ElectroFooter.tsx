import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

export default function ElectroFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-10 lg:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* About */}
          <div>
            <Image src="/trust-cart-logo-main.png" alt="TrustCart" width={200} height={80} className="h-20 w-auto object-contain mb-5 brightness-0 invert" />
            <p className="text-sm leading-relaxed text-gray-400 mb-5">
              Your trusted destination for pure, organic grocery products. We are committed to delivering honest quality, fresh selections, and reliable service — straight to your doorstep across Bangladesh.
            </p>
            <div className="flex gap-2.5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                 aria-label="Facebook">
                <FaFacebook size={16} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                 aria-label="Twitter">
                <FaTwitter size={16} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                 aria-label="Instagram">
                <FaInstagram size={16} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800 hover:bg-orange-500 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                 aria-label="YouTube">
                <FaYoutube size={16} />
              </a>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 tracking-wide uppercase">Customer Service</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/contact" className="text-gray-400 hover:text-orange-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-gray-400 hover:text-orange-400 transition-colors">Shipping Policy</Link></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-orange-400 transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-orange-400 transition-colors">FAQ</Link></li>
              <li><Link href="/track-order" className="text-gray-400 hover:text-orange-400 transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 tracking-wide uppercase">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="text-gray-400 hover:text-orange-400 transition-colors">About Us</Link></li>
              <li><Link href="/products" className="text-gray-400 hover:text-orange-400 transition-colors">Shop</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-orange-400 transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-orange-400 transition-colors">Careers</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-orange-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 tracking-wide uppercase">Contact Info</h4>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-orange-500 mt-0.5 flex-shrink-0" size={14} />
                <span className="text-gray-400">Basabo, Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhone className="text-orange-500 flex-shrink-0" size={14} />
                <span className="text-gray-400">09647248283</span>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="text-orange-500 flex-shrink-0" size={14} />
                <span className="text-gray-400 break-all">support@trustcart.com</span>
              </li>
            </ul>
            <div className="mt-5 pt-5 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2.5 uppercase tracking-wider font-medium">We Accept</p>
              <div className="flex gap-2 flex-wrap">
                <span className="bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1 rounded text-xs font-bold tracking-wide">VISA</span>
                <span className="bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1 rounded text-xs font-bold tracking-wide">MASTER</span>
                <span className="bg-gray-800 text-orange-400 border border-gray-700 px-3 py-1 rounded text-xs font-bold tracking-wide">bKash</span>
                <span className="bg-gray-800 text-pink-400 border border-gray-700 px-3 py-1 rounded text-xs font-bold tracking-wide">Nagad</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-2">
            <p>&copy; {new Date().getFullYear()} TrustCart. All Rights Reserved.</p>
            <p>
              Designed by <span className="text-orange-500 font-medium">TrustCart Team</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
