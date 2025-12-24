import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { blog, products } from '../../services/api';
import ProductCard from '../../components/ProductCard';

export default function BlogPostPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState<any | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    loadPost();
    loadProducts();
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const postData = await blog.getPostBySlug(slug as string);
      setPost(postData);

      if (postData && postData.id) {
        const related = await blog.getRelatedPosts(postData.id);
        setRelatedPosts(related);
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      router.push('/404');
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const productsData = await products.list();
      const shuffled = [...productsData].sort(() => 0.5 - Math.random());
      setRelatedProducts(shuffled.slice(0, 6));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading blog post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container py-5 text-center">
        <h2>Blog post not found</h2>
        <Link href="/blog">← Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8">
          {/* Breadcrumb */}
          <nav style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
            <Link href="/" style={{ color: '#1b5e20', textDecoration: 'none' }}>Home</Link>
            {' > '}
            <Link href="/blog" style={{ color: '#1b5e20', textDecoration: 'none' }}>Blog</Link>
            {' > '}
            <span style={{ color: '#666' }}>{post.title}</span>
          </nav>

          {/* Post Header */}
          <div style={{ marginBottom: '30px' }}>
            {/* Category */}
            {post.category_name && (
              <div style={{ marginBottom: '15px' }}>
                <Link 
                  href={`/blog/category/${post.category_slug}`}
                  style={{
                    backgroundColor: '#e8f5e9',
                    color: '#1b5e20',
                    padding: '6px 16px',
                    borderRadius: '15px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  {post.category_name}
                </Link>
              </div>
            )}

            {/* Title */}
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#323232',
              marginBottom: '15px',
              lineHeight: '1.3'
            }}>
              {post.title}
            </h1>

            {/* Meta */}
            <div style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              marginBottom: '20px',
              fontSize: '0.95rem',
              color: '#666'
            }}>
              <span>✍️ {post.author || 'TrustCart Team'}</span>
              <span>📅 {formatDate(post.created_at)}</span>
              <span>👁️ {post.views || 0} views</span>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {post.tags.map((tag: any) => (
                  <Link
                    key={tag.id}
                    href={`/blog/tag/${tag.slug}`}
                    style={{
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      padding: '5px 15px',
                      borderRadius: '15px',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      border: '1px solid #e0e0e0',
                      transition: 'all 0.3s ease'
                    }}
                    className="tag-link"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Featured Image */}
            {post.featured_image && (
              <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '30px'
              }}>
                <img 
                  src={post.featured_image} 
                  alt={post.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
          </div>

          {/* Post Content */}
          <div 
            className="blog-content"
            style={{
              fontSize: '1.1rem',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '50px'
            }}
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }}
          />

          {/* Share Section */}
          <div style={{
            borderTop: '2px solid #e0e0e0',
            borderBottom: '2px solid #e0e0e0',
            padding: '20px 0',
            marginBottom: '40px'
          }}>
            <h5 style={{ marginBottom: '15px', color: '#323232' }}>Share this article:</h5>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a 
                href={`https://facebook.com/sharer/sharer.php?u=${typeof window !== 'undefined' ? window.location.href : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1877f2',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Facebook
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${typeof window !== 'undefined' ? window.location.href : ''}&text=${post.title}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1da1f2',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Twitter
              </a>
              <a 
                href={`https://wa.me/?text=${post.title} ${typeof window !== 'undefined' ? window.location.href : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#25d366',
                  color: 'white',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div style={{ marginTop: '50px' }}>
              <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '30px', color: '#323232' }}>
                Related Articles
              </h3>
              <div className="row g-4">
                {relatedPosts.map((relatedPost) => (
                  <div key={relatedPost.id} className="col-md-4">
                    <Link href={`/blog/${relatedPost.slug}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          backgroundColor: 'white'
                        }}
                        className="related-post-card"
                      >
                        <div style={{ 
                          height: '150px', 
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {relatedPost.featured_image ? (
                            <img 
                              src={relatedPost.featured_image} 
                              alt={relatedPost.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '2rem' }}>📝</div>
                          )}
                        </div>
                        <div style={{ padding: '15px' }}>
                          <h5 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#323232',
                            marginBottom: '8px',
                            lineHeight: '1.4'
                          }}>
                            {relatedPost.title}
                          </h5>
                          <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '0' }}>
                            {formatDate(relatedPost.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Author Box */}
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '25px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '15px', color: '#323232' }}>
              About the Author
            </h4>
            <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '10px' }}>
              <strong>{post.author || 'TrustCart Health Team'}</strong>
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Passionate about health and wellness, sharing evidence-based information to help you 
              live a healthier, happier life.
            </p>
          </div>

          {/* Related Products */}
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '25px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h4 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#1b5e20' }}>
              Related Products
            </h4>
            <div className="row g-3">
              {relatedProducts.map((product) => (
                <div key={product.id} className="col-12">
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
            <div className="text-center mt-3">
              <Link 
                href="/products" 
                style={{ 
                  color: '#1b5e20', 
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Shop All Products →
              </Link>
            </div>
          </div>

          {/* Back to Blog */}
          <div className="text-center">
            <Link 
              href="/blog" 
              style={{
                display: 'inline-block',
                padding: '12px 30px',
                backgroundColor: '#1b5e20',
                color: 'white',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              ← Back to Blog
            </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .blog-content h1, .blog-content h2, .blog-content h3 {
          color: #323232;
          margin-top: 30px;
          margin-bottom: 15px;
          font-weight: 700;
        }
        .blog-content h1 { font-size: 2rem; }
        .blog-content h2 { font-size: 1.7rem; }
        .blog-content h3 { font-size: 1.4rem; }
        .blog-content p {
          margin-bottom: 20px;
        }
        .blog-content ul, .blog-content ol {
          margin-bottom: 20px;
          padding-left: 30px;
        }
        .blog-content li {
          margin-bottom: 10px;
        }
        .blog-content strong {
          font-weight: 600;
          color: #323232;
        }
        .tag-link:hover {
          background-color: #1b5e20 !important;
          color: white !important;
        }
        .related-post-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
}
