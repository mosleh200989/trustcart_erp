import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import Link from 'next/link';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      
      <footer className="mt-auto">
        <div className="container py-5">
          <div className="row">
            <div className="col-md-3 mb-4">
              <h5>🌿 TrustCart</h5>
              <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                Your trusted online marketplace for organic and natural products.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.5rem' }}>
                  📘
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.5rem' }}>
                  📷
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.5rem' }}>
                  🐦
                </a>
              </div>
            </div>

            <div className="col-md-3 mb-4">
              <h5>Help & Support</h5>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><Link href="#">Privacy Policy</Link></li>
                <li><Link href="#">Returns & Exchanges</Link></li>
                <li><Link href="#">Shipping Info</Link></li>
                <li><Link href="#">Terms & Conditions</Link></li>
                <li><Link href="#">FAQ</Link></li>
              </ul>
            </div>

            <div className="col-md-3 mb-4">
              <h5>Useful Links</h5>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li><Link href="#">Our Story</Link></li>
                <li><Link href="#">Store Locations</Link></li>
                <li><Link href="#">Contact Us</Link></li>
                <li><Link href="#">About TrustCart</Link></li>
                <li><Link href="#">My Account</Link></li>
              </ul>
            </div>

            <div className="col-md-3 mb-4">
              <h5>Contact Info</h5>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                📍 GP Gha 2/3, Mohakhali, Dhaka, Bangladesh
              </p>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                📧 <a href="mailto:contact@trustcart.com.bd" style={{ display: 'inline' }}>
                  contact@trustcart.com.bd
                </a>
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                📞 <a href="tel:01805486094" style={{ display: 'inline' }}>
                  01805486094
                </a>
              </p>
            </div>
          </div>

          <div className="footer-divider" />

          <div className="row align-items-center">
            <div className="col-md-6">
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: '0.8' }}>
                © 2024 TrustCart. All rights reserved.
              </p>
            </div>
            <div className="col-md-6" style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: '0.8' }}>
                Made with ❤️ for conscious eaters
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
