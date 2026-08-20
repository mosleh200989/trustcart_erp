-- Blog System Migration
-- Creates tables for blog posts, categories, tags, and relationships

-- 1. Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image VARCHAR(255),
  category_id INTEGER REFERENCES blog_categories(id),
  author VARCHAR(100),
  status VARCHAR(20) DEFAULT 'published',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create blog_post_tags junction table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  blog_post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
  blog_tag_id INTEGER REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, blog_tag_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);

-- 6. Insert blog categories
INSERT INTO blog_categories (name, slug, description) VALUES
('Health & Wellness', 'health-wellness', 'Tips and advice for maintaining a healthy lifestyle'),
('Nutrition', 'nutrition', 'Nutritional information and healthy eating guides'),
('Natural Remedies', 'natural-remedies', 'Traditional and natural healing methods'),
('Fitness', 'fitness', 'Exercise tips and workout routines'),
('Mental Health', 'mental-health', 'Mental wellness and stress management')
ON CONFLICT (slug) DO NOTHING;

-- 7. Insert blog tags
INSERT INTO blog_tags (name, slug) VALUES
('Organic', 'organic'),
('Healthy Eating', 'healthy-eating'),
('Weight Loss', 'weight-loss'),
('Immunity', 'immunity'),
('Detox', 'detox'),
('Energy Boost', 'energy-boost'),
('Heart Health', 'heart-health'),
('Diabetes', 'diabetes'),
('Skin Care', 'skin-care'),
('Stress Relief', 'stress-relief'),
('Sleep', 'sleep'),
('Vitamins', 'vitamins')
ON CONFLICT (slug) DO NOTHING;

-- 8. Insert sample blog posts (Health Tips)
INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category_id, author, status) VALUES
(
  'The Benefits of Honey: Nature''s Sweet Medicine',
  'benefits-of-honey-natures-sweet-medicine',
  'Discover how honey has been used for centuries as both food and medicine, with powerful antibacterial and antioxidant properties.',
  E'# The Benefits of Honey: Nature''s Sweet Medicine

Honey has been treasured for thousands of years, not just for its delicious taste but also for its remarkable health benefits. This golden liquid is packed with nutrients and powerful compounds that can boost your health in numerous ways.

## Antibacterial Properties
Honey contains natural antibacterial properties, making it excellent for wound healing and fighting infections. Medical-grade honey is even used in hospitals to treat burns and wounds.

## Rich in Antioxidants
Quality honey is loaded with antioxidants, including phenolic compounds and enzymes. These antioxidants help protect your body from cell damage and reduce inflammation.

## Soothes Coughs and Throat
Honey is a natural cough suppressant and can provide relief from sore throats. A spoonful of honey before bed can help reduce nighttime coughing in both children and adults.

## Boosts Energy
The natural sugars in honey provide a quick energy boost, making it an excellent pre-workout snack or natural sweetener for your morning tea.

## How to Use Honey
- Add to warm water with lemon in the morning
- Use as a natural sweetener in tea or coffee
- Apply topically to minor cuts and burns
- Mix with cinnamon for added health benefits

Remember to choose raw, organic honey for maximum health benefits!',
  '/blog/honey-benefits.jpg',
  1,
  'TrustCart Health Team',
  'published'
),
(
  '10 Superfoods to Boost Your Immune System',
  '10-superfoods-boost-immune-system',
  'Learn about the top superfoods that can naturally strengthen your immune system and help you stay healthy year-round.',
  E'# 10 Superfoods to Boost Your Immune System

Your immune system is your body''s first line of defense against illness. These nutrient-rich superfoods can help strengthen your immunity naturally.

## 1. Citrus Fruits
Rich in Vitamin C, citrus fruits help increase white blood cell production, which is key to fighting infections.

## 2. Garlic
Contains allicin, a compound with powerful immune-boosting properties that can help fight bacteria and viruses.

## 3. Ginger
Has anti-inflammatory and antioxidant properties that can help reduce inflammation and boost immunity.

## 4. Turmeric
Curcumin, the active compound in turmeric, is a potent anti-inflammatory that enhances immune function.

## 5. Spinach
Packed with vitamins A, C, and E, plus antioxidants and beta-carotene, spinach is a powerhouse for immunity.

## 6. Yogurt
Contains probiotics that support gut health, where 70% of your immune system resides.

## 7. Almonds
Rich in Vitamin E, a powerful antioxidant crucial for maintaining a healthy immune system.

## 8. Green Tea
Contains EGCG, a potent antioxidant that has been shown to enhance immune function.

## 9. Papaya
Loaded with Vitamin C and digestive enzymes that have anti-inflammatory effects.

## 10. Beetroot
Rich in antioxidants and nutrients that support immune health and reduce inflammation.

Incorporate these superfoods into your daily diet for optimal immune support!',
  '/blog/superfoods-immunity.jpg',
  2,
  'Dr. Sarah Ahmed',
  'published'
),
(
  'Natural Ways to Improve Your Sleep Quality',
  'natural-ways-improve-sleep-quality',
  'Struggling with sleep? Discover natural remedies and lifestyle changes that can help you get better, more restful sleep.',
  E'# Natural Ways to Improve Your Sleep Quality

Quality sleep is essential for physical health, mental clarity, and overall well-being. Here are natural ways to improve your sleep.

## Create a Sleep Schedule
Go to bed and wake up at the same time every day, even on weekends. This helps regulate your body''s internal clock.

## Herbal Teas Before Bed
- **Chamomile Tea**: Contains apigenin, an antioxidant that promotes sleepiness
- **Lavender Tea**: Has calming properties that reduce anxiety
- **Valerian Root**: A natural sleep aid used for centuries

## Optimize Your Bedroom
- Keep the room cool (60-67°F)
- Use blackout curtains
- Remove electronic devices
- Invest in a comfortable mattress

## Natural Supplements
- **Melatonin**: Regulates sleep-wake cycles
- **Magnesium**: Promotes relaxation
- **L-theanine**: Reduces stress and anxiety

## Avoid These Before Bed
- Caffeine (at least 6 hours before)
- Heavy meals
- Alcohol
- Blue light from screens

## Relaxation Techniques
- Deep breathing exercises
- Progressive muscle relaxation
- Meditation
- Gentle yoga

Better sleep leads to better health. Try these natural methods for 2-3 weeks and notice the difference!',
  '/blog/sleep-quality.jpg',
  3,
  'TrustCart Health Team',
  'published'
),
(
  'The Power of Beetroot: Health Benefits and Uses',
  'power-of-beetroot-health-benefits',
  'Beetroot is a nutritional powerhouse packed with vitamins, minerals, and plant compounds that offer impressive health benefits.',
  E'# The Power of Beetroot: Health Benefits and Uses

Beetroot, with its vibrant red color, is more than just a pretty vegetable. It''s a superfood packed with nutrients that can transform your health.

## Nutritional Profile
Beetroot is rich in:
- Folate (Vitamin B9)
- Manganese
- Potassium
- Iron
- Vitamin C
- Fiber
- Nitrates

## Health Benefits

### 1. Lowers Blood Pressure
The nitrates in beetroot convert to nitric oxide, which relaxes and dilates blood vessels, improving blood flow and lowering blood pressure.

### 2. Improves Athletic Performance
Beetroot juice is popular among athletes because it enhances oxygen use and increases stamina during exercise.

### 3. Supports Brain Health
The nitrates in beets may improve mental and cognitive function by promoting blood flow to the brain.

### 4. Anti-Inflammatory Properties
Beetroot contains betalains, powerful antioxidants with anti-inflammatory effects.

### 5. Aids Digestion
High fiber content promotes digestive health and prevents constipation.

### 6. Supports Detoxification
Beetroot supports liver function and helps the body eliminate toxins.

## How to Consume Beetroot
- **Fresh Juice**: Most potent form, best consumed in the morning
- **Beetroot Powder**: Convenient and concentrated
- **Roasted**: Delicious and retains most nutrients
- **Raw Salads**: Maximum fiber and nutrients

## Beetroot Smoothie Recipe
- 1 small beetroot (cooked or raw)
- 1 banana
- 1 cup berries
- 1 cup almond milk
- 1 tablespoon honey

Blend and enjoy this nutritious drink!

**Note**: Beetroot may cause red urine or stool, which is harmless.',
  '/blog/beetroot-benefits.jpg',
  2,
  'Nutritionist Fatima Khan',
  'published'
),
(
  'Stress Management: Natural Techniques for a Calmer Mind',
  'stress-management-natural-techniques',
  'Effective natural strategies to reduce stress, improve mental clarity, and enhance your overall well-being.',
  E'# Stress Management: Natural Techniques for a Calmer Mind

In today''s fast-paced world, stress has become a common companion. Here are natural, effective ways to manage stress and find inner peace.

## Understanding Stress
Stress triggers the release of cortisol, which in small amounts is helpful but can be harmful when chronic.

## Natural Stress Relief Techniques

### 1. Mindful Breathing
Practice 4-7-8 breathing:
- Inhale for 4 seconds
- Hold for 7 seconds
- Exhale for 8 seconds
- Repeat 4 times

### 2. Herbal Remedies
- **Ashwagandha**: Adaptogen that reduces cortisol
- **Holy Basil (Tulsi)**: Calms the nervous system
- **Passionflower**: Reduces anxiety
- **Lemon Balm**: Promotes relaxation

### 3. Physical Activity
- 30 minutes of daily exercise
- Yoga for mind-body connection
- Walking in nature
- Dancing or swimming

### 4. Nutrition for Stress
Foods that help combat stress:
- Dark chocolate
- Fatty fish (omega-3s)
- Green tea
- Nuts and seeds
- Avocados

### 5. Sleep Hygiene
Lack of sleep amplifies stress. Aim for 7-9 hours nightly.

### 6. Social Connection
Spend time with loved ones, join support groups, or volunteer.

### 7. Time in Nature
Even 20 minutes outdoors can significantly reduce cortisol levels.

## Daily Stress Management Routine
- **Morning**: Meditation (10 min) + Healthy breakfast
- **Midday**: Short walk + Herbal tea
- **Evening**: Gentle yoga + Warm bath
- **Night**: Gratitude journal + Relaxation

Remember: Managing stress is a journey, not a destination. Be patient with yourself!',
  '/blog/stress-management.jpg',
  5,
  'Dr. Sarah Ahmed',
  'published'
),
(
  'Olive Oil: Liquid Gold for Your Health',
  'olive-oil-liquid-gold-health',
  'Explore the incredible health benefits of olive oil and why it''s considered one of the healthiest fats in the world.',
  E'# Olive Oil: Liquid Gold for Your Health

Extra virgin olive oil has been a staple of the Mediterranean diet for thousands of years. Modern science now confirms what ancient civilizations knew – it''s incredibly healthy.

## What Makes Olive Oil Special?

### Rich in Healthy Fats
- 73% monounsaturated fat (oleic acid)
- Anti-inflammatory properties
- Heart-protective benefits

### Loaded with Antioxidants
- Vitamin E
- Polyphenols
- Oleocanthal (anti-inflammatory)

## Health Benefits

### 1. Heart Health
Regular consumption reduces risk of:
- Heart disease
- Stroke
- High blood pressure
- High cholesterol

### 2. Anti-Inflammatory Effects
Contains oleocanthal, which works similarly to ibuprofen in reducing inflammation.

### 3. Brain Health
May protect against cognitive decline and Alzheimer''s disease.

### 4. Cancer Prevention
Studies suggest olive oil may reduce risk of certain cancers, particularly breast and colon cancer.

### 5. Weight Management
Despite being calorie-dense, olive oil promotes satiety and can aid in weight control.

### 6. Diabetes Prevention
Helps regulate blood sugar levels and improve insulin sensitivity.

## How to Choose Quality Olive Oil
- **Extra Virgin**: Highest quality, cold-pressed
- **Dark Bottle**: Protects from light damage
- **Harvest Date**: Look for recent dates
- **Origin**: Single-source is best

## Uses
- **Cooking**: Low to medium heat (not high heat frying)
- **Salad Dressings**: Mix with vinegar or lemon
- **Dipping**: With bread and herbs
- **Finishing**: Drizzle over cooked dishes

## Daily Recommendation
2-3 tablespoons daily for optimal health benefits.

**Storage Tip**: Keep in a cool, dark place. Use within 6 months of opening.

Transform your health with this liquid gold!',
  '/blog/olive-oil-benefits.jpg',
  2,
  'Nutritionist Fatima Khan',
  'published'
);

-- 9. Link blog posts with tags
-- Honey post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 1, id FROM blog_tags WHERE slug IN ('organic', 'immunity', 'energy-boost', 'natural-remedies')
ON CONFLICT DO NOTHING;

-- Superfoods post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 2, id FROM blog_tags WHERE slug IN ('immunity', 'healthy-eating', 'vitamins', 'organic')
ON CONFLICT DO NOTHING;

-- Sleep post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 3, id FROM blog_tags WHERE slug IN ('sleep', 'stress-relief', 'natural-remedies')
ON CONFLICT DO NOTHING;

-- Beetroot post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 4, id FROM blog_tags WHERE slug IN ('heart-health', 'energy-boost', 'detox', 'healthy-eating')
ON CONFLICT DO NOTHING;

-- Stress management post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 5, id FROM blog_tags WHERE slug IN ('stress-relief', 'mental-health', 'sleep', 'natural-remedies')
ON CONFLICT DO NOTHING;

-- Olive oil post tags
INSERT INTO blog_post_tags (blog_post_id, blog_tag_id)
SELECT 6, id FROM blog_tags WHERE slug IN ('heart-health', 'healthy-eating', 'organic', 'weight-loss')
ON CONFLICT DO NOTHING;

-- Verify the migration
SELECT 'Categories:', COUNT(*) FROM blog_categories;
SELECT 'Tags:', COUNT(*) FROM blog_tags;
SELECT 'Blog Posts:', COUNT(*) FROM blog_posts;
SELECT 'Post-Tag Relations:', COUNT(*) FROM blog_post_tags;

-- Show sample data
SELECT id, title, slug, category_id FROM blog_posts LIMIT 5;
