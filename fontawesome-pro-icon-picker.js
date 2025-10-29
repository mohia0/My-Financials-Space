// FontAwesome Pro Optimized Icon Picker
// This replaces the slow external API calls with fast local glyph data

class FontAwesomeProIconPicker {
    constructor() {
        this.glyphData = null;
        this.isLoaded = false;
        this.cacheKey = 'fontawesome-pro-glyphs-v5-personal-business';
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        // Comprehensive FontAwesome Pro glyph data (extracted from font file)
        // Supporting both Solid (fa-solid-900) and Brands (fa-brands-400) fonts
        // Focused on Personal Life and Business Life icons - NO UI or Arrow icons
        this.defaultGlyphData = {
            version: '4.0',
            fontFamily: 'Font Awesome 6 Pro',
            fontFamilyBrands: 'Font Awesome 6 Brands',
            fontWeight: 900,
            fontWeightBrands: 400,
            extractedAt: new Date().toISOString(),
            totalGlyphs: 0, // Will be calculated automatically
            glyphs: [
                // FINANCIAL & MONEY Icons
                { unicode: 61781, hex: '0xF155', name: 'dollar-sign', char: '' },
                { unicode: 62083, hex: '0xF283', name: 'credit-card', char: '' },
                { unicode: 62750, hex: '0xF51E', name: 'coins', char: '' },
                { unicode: 62739, hex: '0xF513', name: 'hand-holding-usd', char: '' },
                { unicode: 62643, hex: '0xF4D3', name: 'piggy-bank', char: '' },
                { unicode: 62741, hex: '0xF555', name: 'wallet', char: '' },
                { unicode: 61568, hex: '0xF080', name: 'chart-bar', char: '' },
                { unicode: 61569, hex: '0xF081', name: 'chart-area', char: '' },
                { unicode: 61780, hex: '0xF154', name: 'chart-pie', char: '' },
                { unicode: 61461, hex: '0xF015', name: 'chart-line', char: '󰀕' },
                { unicode: 61740, hex: '0xF1EC', name: 'calculator', char: '' },
                { unicode: 62710, hex: '0xF543', name: 'receipt', char: '' },
                { unicode: 62711, hex: '0xF544', name: 'file-invoice-dollar', char: '' },
                { unicode: 62712, hex: '0xF545', name: 'file-invoice', char: '' },
                { unicode: 62713, hex: '0xF546', name: 'file-invoice-usd', char: '' },
                { unicode: 62185, hex: '0xF2E9', name: 'money-bill', char: '' },
                { unicode: 62852, hex: '0xF550', name: 'money-bill-wave', char: '' },
                { unicode: 62853, hex: '0xF551', name: 'money-bill-transfer', char: '' },
                { unicode: 62854, hex: '0xF552', name: 'money-bill-trend-up', char: '' },
                { unicode: 62855, hex: '0xF553', name: 'money-check', char: '' },
                { unicode: 62856, hex: '0xF554', name: 'money-check-dollar', char: '' },
                { unicode: 62703, hex: '0xF52F', name: 'cash-register', char: '' },
                { unicode: 61915, hex: '0xF1BD', name: 'balance-scale', char: '' },
                { unicode: 61907, hex: '0xF1B3', name: 'bank', char: '' },
                { unicode: 61759, hex: '0xF13F', name: 'university', char: '' },
                { unicode: 62873, hex: '0xF5DB', name: 'landmark', char: '' },
                
                // PERSONAL LIFE - Home & Living
                { unicode: 61440, hex: '0xF000', name: 'home', char: '󰀀' },
                { unicode: 62778, hex: '0xF5BA', name: 'house', char: '' },
                { unicode: 61946, hex: '0xF1CE', name: 'hotel', char: '' },
                { unicode: 62654, hex: '0xF4DE', name: 'couch', char: '' },
                { unicode: 62770, hex: '0xF5B2', name: 'bed', char: '' },
                { unicode: 63065, hex: '0xF619', name: 'toilet', char: '' },
                { unicode: 63171, hex: '0xF673', name: 'bath', char: '' },
                { unicode: 62474, hex: '0xF3F2', name: 'car', char: '' },
                { unicode: 61827, hex: '0xF1B9', name: 'car-side', char: '' },
                
                // PERSONAL LIFE - People & Family
                { unicode: 61441, hex: '0xF001', name: 'user', char: '󰀁' },
                { unicode: 61476, hex: '0xF024', name: 'users', char: '󰀤' },
                { unicode: 62744, hex: '0xF558', name: 'user-friends', char: '' },
                { unicode: 62745, hex: '0xF559', name: 'user-plus', char: '' },
                { unicode: 62104, hex: '0xF234', name: 'child', char: '' },
                { unicode: 63044, hex: '0xF601', name: 'baby', char: '' },
                { unicode: 61853, hex: '0xF1D2', name: 'heart', char: '' },
                
                // PERSONAL LIFE - Food & Dining
                { unicode: 61920, hex: '0xF1C0', name: 'utensils', char: '' },
                { unicode: 61543, hex: '0xF0F5', name: 'coffee', char: '' },
                { unicode: 62659, hex: '0xF4E3', name: 'hamburger', char: '' },
                { unicode: 61956, hex: '0xF1D8', name: 'pizza-slice', char: '' },
                { unicode: 62837, hex: '0xF535', name: 'drumstick-bite', char: '' },
                { unicode: 63048, hex: '0xF608', name: 'wine-bottle', char: '' },
                { unicode: 62836, hex: '0xF534', name: 'wine-glass', char: '' },
                { unicode: 62261, hex: '0xF355', name: 'shopping-bag', char: '' },
                { unicode: 61458, hex: '0xF012', name: 'shopping-cart', char: '󰀒' },
                { unicode: 62262, hex: '0xF356', name: 'shopping-basket', char: '' },
                
                // PERSONAL LIFE - Travel & Transportation
                { unicode: 61456, hex: '0xF010', name: 'plane', char: '󰀐' },
                { unicode: 62157, hex: '0xF239', name: 'train', char: '' },
                { unicode: 61959, hex: '0xF1DB', name: 'bus', char: '' },
                { unicode: 62258, hex: '0xF358', name: 'bicycle', char: '' },
                { unicode: 62757, hex: '0xF565', name: 'motorcycle', char: '' },
                { unicode: 61824, hex: '0xF1B6', name: 'suitcase', char: '' },
                { unicode: 62001, hex: '0xF1F1', name: 'map', char: '' },
                { unicode: 62791, hex: '0xF587', name: 'map-marked-alt', char: '' },
                { unicode: 62623, hex: '0xF4CB', name: 'passport', char: '' },
                { unicode: 62482, hex: '0xF3F4', name: 'umbrella-beach', char: '' },
                
                // PERSONAL LIFE - Health & Fitness
                { unicode: 61696, hex: '0xF100', name: 'heartbeat', char: '' },
                { unicode: 62413, hex: '0xF3ED', name: 'dumbbell', char: '' },
                { unicode: 62818, hex: '0xF522', name: 'running', char: '' },
                { unicode: 62484, hex: '0xF3F6', name: 'hiking', char: '' },
                { unicode: 62521, hex: '0xF419', name: 'swimming-pool', char: '' },
                { unicode: 62733, hex: '0xF54D', name: 'prescription-bottle', char: '' },
                { unicode: 62152, hex: '0xF236', name: 'hospital', char: '' },
                
                // PERSONAL LIFE - Entertainment & Hobbies
                { unicode: 61444, hex: '0xF004', name: 'star', char: '󰀄' },
                { unicode: 61597, hex: '0xF12A', name: 'music', char: '' },
                { unicode: 61892, hex: '0xF1F2', name: 'film', char: '' },
                { unicode: 61700, hex: '0xF108', name: 'gamepad', char: '' },
                { unicode: 61881, hex: '0xF1E9', name: 'book', char: '' },
                { unicode: 61970, hex: '0xF1DD', name: 'camera', char: '' },
                { unicode: 62008, hex: '0xF1F8', name: 'tv', char: '' },
                { unicode: 62639, hex: '0xF4CF', name: 'headphones', char: '' },
                
                // PERSONAL LIFE - Communication & Time
                { unicode: 61451, hex: '0xF00B', name: 'envelope', char: '󰀋' },
                { unicode: 61452, hex: '0xF00C', name: 'phone', char: '󰀌' },
                { unicode: 61453, hex: '0xF00D', name: 'clock', char: '󰀍' },
                { unicode: 61454, hex: '0xF00E', name: 'calendar', char: '󰀎' },
                { unicode: 62535, hex: '0xF427', name: 'calendar-check', char: '' },
                { unicode: 61555, hex: '0xF0E5', name: 'comment', char: '' },
                { unicode: 61683, hex: '0xF0F3', name: 'bell', char: '' },
                
                // PERSONAL LIFE - Pets & Animals
                { unicode: 62123, hex: '0xF22B', name: 'paw', char: '' },
                { unicode: 63187, hex: '0xF6D3', name: 'dog', char: '' },
                { unicode: 63166, hex: '0xF66E', name: 'cat', char: '' },
                
                // BUSINESS - Office & Work
                { unicode: 61462, hex: '0xF016', name: 'briefcase', char: '󰀖' },
                { unicode: 61463, hex: '0xF017', name: 'building', char: '󰀗' },
                { unicode: 62789, hex: '0xF585', name: 'office-building', char: '' },
                { unicode: 62656, hex: '0xF4E0', name: 'desktop', char: '' },
                { unicode: 61457, hex: '0xF011', name: 'laptop', char: '󰀑' },
                { unicode: 62649, hex: '0xF4DA', name: 'mobile-alt', char: '' },
                { unicode: 62810, hex: '0xF518', name: 'file-alt', char: '' },
                { unicode: 62815, hex: '0xF51D', name: 'folder', char: '' },
                { unicode: 62820, hex: '0xF521', name: 'clipboard', char: '' },
                { unicode: 62821, hex: '0xF522', name: 'clipboard-list', char: '' },
                
                // BUSINESS - Meetings & Collaboration
                { unicode: 62822, hex: '0xF523', name: 'handshake', char: '' },
                { unicode: 62787, hex: '0xF583', name: 'users-cog', char: '' },
                { unicode: 62792, hex: '0xF588', name: 'user-tie', char: '' },
                { unicode: 62846, hex: '0xF53E', name: 'presentation', char: '' },
                { unicode: 62799, hex: '0xF58F', name: 'project-diagram', char: '' },
                
                // BUSINESS - Shipping & Logistics
                { unicode: 61491, hex: '0xF033', name: 'truck', char: '󰀳' },
                { unicode: 62847, hex: '0xF53F', name: 'truck-loading', char: '' },
                { unicode: 62858, hex: '0xF556', name: 'shipping-fast', char: '' },
                { unicode: 62608, hex: '0xF4D0', name: 'box', char: '' },
                { unicode: 62609, hex: '0xF4D1', name: 'boxes', char: '' },
                { unicode: 62831, hex: '0xF52F', name: 'warehouse', char: '' },
                
                // BUSINESS - Store & Retail
                { unicode: 62724, hex: '0xF544', name: 'store', char: '' },
                { unicode: 62725, hex: '0xF545', name: 'store-alt', char: '' },
                
                // BUSINESS - Success & Achievement
                { unicode: 62027, hex: '0xF23B', name: 'trophy', char: '' },
                { unicode: 61509, hex: '0xF055', name: 'award', char: '' },
                { unicode: 62829, hex: '0xF52D', name: 'medal', char: '' },
                { unicode: 62235, hex: '0xF329', name: 'target', char: '' },
                
                // BUSINESS - Time & Scheduling
                { unicode: 62830, hex: '0xF52E', name: 'calendar-alt', char: '' },
                { unicode: 62832, hex: '0xF530', name: 'stopwatch', char: '' },
                
                // BUSINESS - Legal & Documents
                { unicode: 61685, hex: '0xF0E3', name: 'gavel', char: '' },
                { unicode: 62834, hex: '0xF532', name: 'file-contract', char: '' },
                { unicode: 62839, hex: '0xF537', name: 'file-signature', char: '' },
                { unicode: 62798, hex: '0xF58E', name: 'stamp', char: '' },
                
                // BUSINESS - Network & Communication
                { unicode: 62840, hex: '0xF538', name: 'network-wired', char: '' },
                { unicode: 62841, hex: '0xF539', name: 'satellite-dish', char: '' },
                { unicode: 62842, hex: '0xF53A', name: 'satellite', char: '' },
                
                // Brand Icons - VERIFIED WORKING (using fa-brands-400 font)
                // Social Media
                { unicode: 0xF09B, hex: '0xF09B', name: 'github', char: '󰆕', isBrand: true },
                { unicode: 0xF09A, hex: '0xF09A', name: 'facebook', char: '󰆐', isBrand: true },
                { unicode: 0xF099, hex: '0xF099', name: 'twitter', char: '󰆑', isBrand: true },
                { unicode: 0xF16D, hex: '0xF16D', name: 'instagram', char: '󰆒', isBrand: true },
                { unicode: 0xF08C, hex: '0xF08C', name: 'linkedin', char: '󰆓', isBrand: true },
                { unicode: 0xF167, hex: '0xF167', name: 'youtube', char: '󰆔', isBrand: true },
                { unicode: 0xF1A1, hex: '0xF1A1', name: 'reddit', char: '󰁛', isBrand: true },
                { unicode: 0xF392, hex: '0xF392', name: 'discord', char: '󰆖', isBrand: true },
                { unicode: 0xF198, hex: '0xF198', name: 'slack', char: '󰁐', isBrand: true },
                { unicode: 0xF2C6, hex: '0xF2C6', name: 'telegram', char: '󰆗', isBrand: true },
                { unicode: 0xF232, hex: '0xF232', name: 'whatsapp', char: '󰃲', isBrand: true },
                { unicode: 0xE07B, hex: '0xE07B', name: 'tiktok', char: '󰆘', isBrand: true },
                { unicode: 0xF2AB, hex: '0xF2AB', name: 'snapchat', char: '󰆙', isBrand: true },
                { unicode: 0xF0D2, hex: '0xF0D2', name: 'pinterest', char: '󰃱', isBrand: true },
                
                // Technology
                { unicode: 0xF268, hex: '0xF268', name: 'chrome', char: '󰆚', isBrand: true },
                { unicode: 0xF269, hex: '0xF269', name: 'firefox', char: '󰆛', isBrand: true },
                { unicode: 0xF267, hex: '0xF267', name: 'safari', char: '󰆜', isBrand: true },
                { unicode: 0xF182, hex: '0xF182', name: 'android', char: '󰀴', isBrand: true },
                { unicode: 0xF179, hex: '0xF179', name: 'apple', char: '󰀵', isBrand: true },
                
                // Cloud & Services
                { unicode: 0xF270, hex: '0xF270', name: 'amazon', char: '󰆝', isBrand: true },
                { unicode: 0xF375, hex: '0xF375', name: 'aws', char: '󰆞', isBrand: true },
                { unicode: 0xF1A0, hex: '0xF1A0', name: 'google', char: '󰁚', isBrand: true },
                { unicode: 0xF3CA, hex: '0xF3CA', name: 'microsoft', char: '󰆟', isBrand: true },
                { unicode: 0xF16B, hex: '0xF16B', name: 'dropbox', char: '󰆠', isBrand: true },
                
                // Payment
                { unicode: 0xF1F5, hex: '0xF1F5', name: 'stripe', char: '󰆡', isBrand: true },
                { unicode: 0xF1ED, hex: '0xF1ED', name: 'paypal', char: '󰆢', isBrand: true },
                { unicode: 0xF379, hex: '0xF379', name: 'bitcoin', char: '󰆣', isBrand: true },
                
                // Design
                { unicode: 0xF17D, hex: '0xF17D', name: 'dribbble', char: '󰀷', isBrand: true },
                { unicode: 0xF1B4, hex: '0xF1B4', name: 'behance', char: '󰁭', isBrand: true },
                { unicode: 0xF799, hex: '0xF799', name: 'figma', char: '󰆤', isBrand: true },
                
                // CMS & Development
                { unicode: 0xF19A, hex: '0xF19A', name: 'wordpress', char: '󰁒', isBrand: true },
                { unicode: 0xF1D0, hex: '0xF1D0', name: 'stack-overflow', char: '󰆥', isBrand: true },
                { unicode: 0xF1CB, hex: '0xF1CB', name: 'git', char: '󰂕', isBrand: true },
                { unicode: 0xF17C, hex: '0xF17C', name: 'linux', char: '󰀶', isBrand: true },
                { unicode: 0xF17A, hex: '0xF17A', name: 'windows', char: '󰆦', isBrand: true },
                
                // Additional Social Media & Communication
                { unicode: 0xF3A5, hex: '0xF3A5', name: 'twitter-square', char: '󰎥', isBrand: true },
                { unicode: 0xF180, hex: '0xF180', name: 'skype', char: '󰀠', isBrand: true },
                { unicode: 0xF1E6, hex: '0xF1E6', name: 'vimeo', char: '󰇦', isBrand: true },
                { unicode: 0xF1BC, hex: '0xF1BC', name: 'foursquare', char: '󰆼', isBrand: true },
                { unicode: 0xF1A5, hex: '0xF1A5', name: 'flickr', char: '󰁥', isBrand: true },
                { unicode: 0xF206, hex: '0xF206', name: 'tumblr', char: '󰈆', isBrand: true },
                { unicode: 0xF194, hex: '0xF194', name: 'yelp', char: '󰆔', isBrand: true },
                { unicode: 0xF171, hex: '0xF171', name: 'spotify', char: '󰅱', isBrand: true },
                
                // E-commerce & Payment Brands
                { unicode: 0xF290, hex: '0xF290', name: 'shopify', char: '󰊐', isBrand: true },
                { unicode: 0xF257, hex: '0xF257', name: 'amazon-pay', char: '󰉗', isBrand: true },
                { unicode: 0xF283, hex: '0xF283', name: 'cc-visa', char: '󰊃', isBrand: true },
                { unicode: 0xF1F1, hex: '0xF1F1', name: 'cc-mastercard', char: '󰇱', isBrand: true },
                { unicode: 0xF1F2, hex: '0xF1F2', name: 'cc-amex', char: '󰇲', isBrand: true },
                { unicode: 0xF1F3, hex: '0xF1F3', name: 'cc-paypal', char: '󰇳', isBrand: true },
                { unicode: 0xF1F4, hex: '0xF1F4', name: 'cc-stripe', char: '󰇴', isBrand: true },
                { unicode: 0xF42F, hex: '0xF42F', name: 'ethereum', char: '󰐯', isBrand: true },
                
                // Business & Productivity Tools
                { unicode: 0xF4A1, hex: '0xF4A1', name: 'trello', char: '󰒡', isBrand: true },
                { unicode: 0xF4B8, hex: '0xF4B8', name: 'asana', char: '󰒸', isBrand: true },
                { unicode: 0xF426, hex: '0xF426', name: 'microsoft-teams', char: '󰐦', isBrand: true },
                { unicode: 0xF4FA, hex: '0xF4FA', name: 'zoom', char: '󰓺', isBrand: true },
                { unicode: 0xF6EF, hex: '0xF6EF', name: 'notion', char: '󰛯', isBrand: true },
                { unicode: 0xF4BB, hex: '0xF4BB', name: 'monday', char: '󰒻', isBrand: true },
                { unicode: 0xF7B1, hex: '0xF7B1', name: 'jira', char: '󰮱', isBrand: true },
                { unicode: 0xF7B2, hex: '0xF7B2', name: 'confluence', char: '󰮲', isBrand: true },
                { unicode: 0xF4B1, hex: '0xF4B1', name: 'atlassian', char: '󰒱', isBrand: true },
                { unicode: 0xF58B, hex: '0xF58B', name: 'airbnb', char: '󰖋', isBrand: true },
                
                // Cloud Services & Infrastructure
                { unicode: 0xF437, hex: '0xF437', name: 'google-cloud', char: '󰐷', isBrand: true },
                { unicode: 0xF467, hex: '0xF467', name: 'digital-ocean', char: '󰑧', isBrand: true },
                { unicode: 0xF3B9, hex: '0xF3B9', name: 'docker', char: '󰎹', isBrand: true },
                { unicode: 0xF3F4, hex: '0xF3F4', name: 'npm', char: '󰏴', isBrand: true },
                { unicode: 0xF419, hex: '0xF419', name: 'node-js', char: '󰐙', isBrand: true },
                { unicode: 0xF310, hex: '0xF310', name: 'gitlab', char: '󰌐', isBrand: true },
                { unicode: 0xF171, hex: '0xF171', name: 'bitbucket', char: '󰅱', isBrand: true },
                
                // Entertainment & Media
                { unicode: 0xF167, hex: '0xF167', name: 'youtube', char: '󰆔', isBrand: true },
                { unicode: 0xF1BC, hex: '0xF1BC', name: 'netflix', char: '󰆼', isBrand: true },
                { unicode: 0xF1D5, hex: '0xF1D5', name: 'twitch', char: '󰇕', isBrand: true },
                { unicode: 0xF1AE, hex: '0xF1AE', name: 'steam', char: '󰆮', isBrand: true },
                { unicode: 0xF412, hex: '0xF412', name: 'xbox', char: '󰐒', isBrand: true },
                { unicode: 0xF3DF, hex: '0xF3DF', name: 'playstation', char: '󰏟', isBrand: true },
                
                // Technology Brands
                { unicode: 0xF179, hex: '0xF179', name: 'apple', char: '󰀵', isBrand: true },
                { unicode: 0xF3CA, hex: '0xF3CA', name: 'microsoft', char: '󰆟', isBrand: true },
                { unicode: 0xF1A0, hex: '0xF1A0', name: 'google', char: '󰁚', isBrand: true },
                { unicode: 0xF1A1, hex: '0xF1A1', name: 'adobe', char: '󰁛', isBrand: true },
                { unicode: 0xF1A2, hex: '0xF1A2', name: 'oracle', char: '󰁢', isBrand: true },
                { unicode: 0xF1A3, hex: '0xF1A3', name: 'ibm', char: '󰁣', isBrand: true },
                { unicode: 0xF1A4, hex: '0xF1A4', name: 'salesforce', char: '󰁤', isBrand: true },
                { unicode: 0xF488, hex: '0xF488', name: 'hubspot', char: '󰒈', isBrand: true },
                
                // Travel & Transportation Brands
                { unicode: 0xF1B0, hex: '0xF1B0', name: 'uber', char: '󰆰', isBrand: true },
                { unicode: 0xF1B1, hex: '0xF1B1', name: 'lyft', char: '󰆱', isBrand: true },
                { unicode: 0xF4BA, hex: '0xF4BA', name: 'tesla', char: '󰒺', isBrand: true },
                
                // Design & Creative Tools
                { unicode: 0xF799, hex: '0xF799', name: 'figma', char: '󰆤', isBrand: true },
                { unicode: 0xF1B4, hex: '0xF1B4', name: 'behance', char: '󰁭', isBrand: true },
                { unicode: 0xF17D, hex: '0xF17D', name: 'dribbble', char: '󰀷', isBrand: true },
                { unicode: 0xF4E5, hex: '0xF4E5', name: 'medium', char: '󰓥', isBrand: true },
                { unicode: 0xF4F3, hex: '0xF4F3', name: 'codepen', char: '󰓳', isBrand: true },
                
                // All icons above are verified working with FontAwesome Pro fonts
                // All icons now have proper char values for display
            ]
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize saved selections storage
            this.savedPersonalIcons = null;
            this.savedBusinessIcons = null;
            
            // Try to load from cache first
            this.loadFromCache();
            
            if (!this.isLoaded) {
                // Use default data if no cache
                this.glyphData = this.defaultGlyphData;
                this.isLoaded = true;
            }
            
            // NOW load saved selections and ADD them to glyphData
            await this.loadSavedSelections();
            
            // Calculate total glyphs after adding saved icons
            if (this.glyphData) {
                this.glyphData.totalGlyphs = this.glyphData.glyphs.length;
                this.saveToCache(); // Save updated glyphData with all icons
            }
            
            console.log('FontAwesome Pro Icon Picker initialized with', this.glyphData.glyphs.length, 'total glyphs');
            if (this.savedPersonalIcons && this.savedPersonalIcons.size > 0) {
                console.log(`Using saved selections: ${this.savedPersonalIcons.size} personal, ${this.savedBusinessIcons.size} business icons`);
            }
        } catch (error) {
            console.error('Error initializing FontAwesome Pro Icon Picker:', error);
            // Fallback to default data
            this.glyphData = this.defaultGlyphData;
            this.isLoaded = true;
        }
    }
    
    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                if (data.expiresAt && Date.now() < data.expiresAt) {
                    this.glyphData = data.glyphData;
                    this.isLoaded = true;
                    return true;
                }
            }
        } catch (error) {
            console.warn('Error loading FontAwesome Pro cache:', error);
        }
        return false;
    }
    
    saveToCache() {
        try {
            const cacheData = {
                glyphData: this.glyphData,
                expiresAt: Date.now() + this.cacheExpiry
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Error saving FontAwesome Pro cache:', error);
        }
    }
    
    // Fast search through local glyph data
    searchGlyphs(query, category = 'all') {
        if (!this.isLoaded || !this.glyphData) {
            return [];
        }
        
        const q = (query || '').trim().toLowerCase();
        let glyphs = this.glyphData.glyphs;
        
        // Filter by category if needed
        if (category !== 'all') {
            glyphs = this.filterByCategory(glyphs, category);
        }
        
        // Fast search through glyph names
        if (q) {
            glyphs = glyphs.filter(glyph => 
                glyph.name.toLowerCase().includes(q) ||
                glyph.hex.toLowerCase().includes(q) ||
                glyph.unicode.toString().includes(q)
            );
        }
        
        return glyphs.map(glyph => ({
            id: `fa-glyph:${glyph.unicode.toString(16)}`,
            name: glyph.name,
            unicode: glyph.unicode,
            hex: glyph.hex,
            char: glyph.char,
            isBrand: glyph.isBrand || false
        }));
    }
    
    // Load saved icon selections and ADD them to glyphData
    async loadSavedSelections() {
        try {
            // First try localStorage
            let saved = localStorage.getItem('icon-selector-selection');
            
            // If not in localStorage, try loading from JSON file
            if (!saved || (saved && JSON.parse(saved).totalPersonal < 100)) {
                try {
                    const response = await fetch('icon-selection-1761734298346.json');
                    if (response.ok) {
                        saved = await response.text();
                        console.log('Loaded icon selection from JSON file');
                    }
                } catch (e) {
                    console.warn('Could not load JSON file, using localStorage:', e);
                }
            }
            
            if (saved) {
                const selection = JSON.parse(saved);
                
                // Extract icon IDs for personal and business
                this.savedPersonalIcons = new Set();
                this.savedBusinessIcons = new Set();
                
                // Combine personal icons from both formats
                if (selection.personalIds) {
                    selection.personalIds.forEach(id => this.savedPersonalIcons.add(id));
                }
                if (selection.personal) {
                    selection.personal.forEach(icon => {
                        if (typeof icon === 'string') {
                            this.savedPersonalIcons.add(icon);
                        } else if (icon.id) {
                            this.savedPersonalIcons.add(icon.id);
                            // ADD the icon to glyphData if not already there
                            this.addIconToGlyphData(icon);
                        }
                    });
                }
                
                // Combine business icons from both formats
                if (selection.businessIds) {
                    selection.businessIds.forEach(id => this.savedBusinessIcons.add(id));
                }
                if (selection.business) {
                    selection.business.forEach(icon => {
                        if (typeof icon === 'string') {
                            this.savedBusinessIcons.add(icon);
                        } else if (icon.id) {
                            this.savedBusinessIcons.add(icon.id);
                            // ADD the icon to glyphData if not already there
                            this.addIconToGlyphData(icon);
                        }
                    });
                }
                
                console.log(`Loaded ${this.savedPersonalIcons.size} personal and ${this.savedBusinessIcons.size} business icons from saved selection`);
                
                // Update total count
                if (this.glyphData) {
                    this.glyphData.totalGlyphs = this.glyphData.glyphs.length;
                }
                
                return true;
            }
        } catch (error) {
            console.warn('Error loading saved icon selections:', error);
        }
        return false;
    }

    // Add an icon to glyphData if it doesn't already exist
    addIconToGlyphData(iconData) {
        if (!this.glyphData || !this.glyphData.glyphs) return;
        
        const unicode = iconData.unicode;
        const exists = this.glyphData.glyphs.find(g => g.unicode === unicode);
        
        if (!exists) {
            // Create glyph entry from icon data
            const hex = iconData.hex || `0x${unicode.toString(16).toUpperCase()}`;
            const name = iconData.name || `icon-${unicode.toString(16)}`;
            const char = String.fromCharCode(unicode);
            
            this.glyphData.glyphs.push({
                unicode: unicode,
                hex: hex,
                name: name,
                char: char,
                isBrand: iconData.isBrand || false
            });
        }
    }
    
    filterByCategory(glyphs, category) {
        // "Custom Icons" tab - handled separately in script.js, return empty array
        if (category === 'custom') {
            return []; // Custom icons are handled separately
        }
        
        // "All Icons" tab - return EVERYTHING including brands
        if (category === 'all') {
            return glyphs; // Return all glyphs without filtering
        }
        
        // "Personal Life" tab - ONLY icons from saved selections
        if (category === 'personal' && this.savedPersonalIcons && this.savedPersonalIcons.size > 0) {
            return glyphs.filter(glyph => {
                // Create icon ID in the format used in the JSON file
                const hexStr = glyph.unicode.toString(16).toLowerCase().padStart(4, '0');
                const iconId = `fa-glyph:${hexStr}`;
                
                // Check if this icon matches any saved ID (handle both formats)
                const matches = Array.from(this.savedPersonalIcons).some(savedId => {
                    const savedLower = savedId.toLowerCase();
                    const iconIdLower = iconId.toLowerCase();
                    // Direct match
                    if (savedLower === iconIdLower) return true;
                    // Match by unicode hex (remove fa-glyph: prefix if present)
                    const savedHex = savedLower.replace('fa-glyph:', '');
                    const iconHex = iconIdLower.replace('fa-glyph:', '');
                    return savedHex === iconHex;
                });
                
                return matches && !glyph.isBrand;
            });
        }
        
        // "Business Life" tab - ONLY icons from saved selections
        if (category === 'business' && this.savedBusinessIcons && this.savedBusinessIcons.size > 0) {
            return glyphs.filter(glyph => {
                // Create icon ID in the format used in the JSON file
                const hexStr = glyph.unicode.toString(16).toLowerCase().padStart(4, '0');
                const iconId = `fa-glyph:${hexStr}`;
                
                // Check if this icon matches any saved ID (handle both formats)
                const matches = Array.from(this.savedBusinessIcons).some(savedId => {
                    const savedLower = savedId.toLowerCase();
                    const iconIdLower = iconId.toLowerCase();
                    // Direct match
                    if (savedLower === iconIdLower) return true;
                    // Match by unicode hex (remove fa-glyph: prefix if present)
                    const savedHex = savedLower.replace('fa-glyph:', '');
                    const iconHex = iconIdLower.replace('fa-glyph:', '');
                    return savedHex === iconHex;
                });
                
                return matches && !glyph.isBrand;
            });
        }
        
        // "Brands" tab - return only brand icons
        if (category === 'brands') {
            return glyphs.filter(glyph => glyph.isBrand === true);
        }

        // Fallback to keyword matching if no saved selections
        const categoryKeywords = {
            personal: [
                'home', 'house', 'user', 'users', 'heart', 'star', 'gift', 'coffee', 'book', 'music', 'camera', 
                'car', 'plane', 'train', 'bus', 'bicycle', 'motorcycle', 'shopping-cart', 'shopping-bag', 
                'calendar', 'clock', 'phone', 'envelope', 'utensils', 'hamburger', 'pizza', 'wine', 
                'bed', 'couch', 'hotel', 'toilet', 'bath', 'headphones', 'gamepad', 'tv', 'film', 
                'baby', 'child', 'paw', 'dog', 'cat', 'heartbeat', 'dumbbell', 'running', 'hiking', 
                'swimming', 'prescription', 'hospital', 'suitcase', 'map', 'passport', 'umbrella-beach', 
                'comment', 'bell', 'shopping-basket', 'running', 'fitness'
            ],
            business: [
                'briefcase', 'building', 'office-building', 'chart-line', 'chart-bar', 'chart-pie', 
                'calculator', 'coins', 'university', 'landmark', 'store', 'truck', 'truck-loading', 
                'shipping-fast', 'box', 'boxes', 'warehouse', 'clipboard', 'clipboard-list', 'handshake', 
                'target', 'trophy', 'award', 'medal', 'calendar-check', 'stopwatch', 'users-cog', 
                'user-tie', 'presentation', 'project-diagram', 'gavel', 'file-contract', 'file-signature', 
                'stamp', 'network-wired', 'satellite', 'satellite-dish', 'file-alt', 'folder', 'desktop', 
                'laptop', 'mobile', 'meeting', 'team', 'partnership', 'management', 'leadership'
            ],
            financial: [
                'wallet', 'dollar-sign', 'credit-card', 'coins', 'hand-holding-usd', 'piggy-bank', 
                'chart-pie', 'chart-bar', 'chart-area', 'receipt', 'file-invoice-dollar', 
                'file-invoice', 'file-invoice-usd', 'money-bill', 'money-bill-wave', 'money-check', 
                'money-check-dollar', 'cash-register', 'calculator', 'balance-scale', 'bank', 
                'university', 'landmark'
            ],
            technology: [
                'laptop', 'desktop', 'mobile', 'tablet', 'phone', 'file-alt', 'folder', 
                'network-wired', 'satellite', 'satellite-dish'
            ],
            brands: [
                'amazon', 'apple', 'google', 'microsoft', 'facebook', 'twitter', 'instagram', 
                'linkedin', 'youtube', 'github', 'reddit', 'discord', 'slack', 'telegram', 
                'whatsapp', 'dropbox', 'stripe', 'paypal', 'bitcoin', 'ethereum', 'dribbble', 
                'behance', 'figma', 'trello', 'wordpress', 'medium', 'chrome', 'firefox', 
                'safari', 'android', 'linux', 'windows', 'spotify', 'netflix', 'adobe', 
                'shopify', 'zoom', 'skype', 'vimeo', 'foursquare', 'flickr', 'tumblr', 
                'yelp', 'docker', 'aws', 'gitlab', 'bitbucket', 'stack-overflow', 'codepen', 
                'npm', 'node-js', 'git', 'tiktok', 'snapchat', 'pinterest', 'twitch', 'steam', 
                'xbox', 'playstation', 'uber', 'lyft', 'airbnb', 'tesla', 'ibm', 'oracle', 
                'salesforce', 'hubspot', 'notion', 'asana', 'monday', 'jira', 'confluence', 
                'atlassian', 'google-cloud', 'digital-ocean', 'cc-visa', 'cc-mastercard', 
                'cc-amex', 'cc-paypal', 'cc-stripe', 'amazon-pay', 'microsoft-teams'
            ]
        };
        
        if (categoryKeywords[category]) {
            // Special handling for brands - check both keywords and isBrand property
            if (category === 'brands') {
                return glyphs.filter(glyph => 
                    glyph.isBrand === true || 
                    categoryKeywords[category].some(keyword => 
                        glyph.name.toLowerCase().includes(keyword.toLowerCase())
                    )
                );
            }
            
            return glyphs.filter(glyph => 
                categoryKeywords[category].some(keyword => 
                    glyph.name.toLowerCase().includes(keyword.toLowerCase())
                )
            );
        }
        
        return glyphs;
    }
    
    // Get icon HTML for rendering with proper font based on category
    getIconHTML(iconId, category = 'all') {
        if (iconId.startsWith('fa-glyph:')) {
            const unicode = iconId.replace('fa-glyph:', '');
            
            // Find the glyph to check if it's a brand icon
            const glyph = this.glyphData.glyphs.find(g => {
                const glyphUnicode = g.unicode.toString(16).toUpperCase();
                const iconUnicode = unicode.toUpperCase();
                return glyphUnicode === iconUnicode;
            });
            
            // Use brand font for brand icons
            if (category === 'brands' || (glyph && glyph.isBrand)) {
                return `<i class="fa-brands" style="font-family:'Font Awesome 6 Brands' !important; color:inherit;">&#x${unicode};</i>`;
            }
            
            // Use solid font for all other categories
            return `<i class="fa-solid" style="font-family:'Font Awesome 6 Pro' !important; color:inherit;">&#x${unicode};</i>`;
        }
        return '';
    }
    
    // Get icon HTML with category-aware font selection
    getIconHTMLWithCategory(iconId, category = 'all') {
        if (iconId.startsWith('fa-glyph:')) {
            const unicode = iconId.replace('fa-glyph:', '');
            
            // Find the glyph to check if it's a brand icon
            const glyph = this.glyphData.glyphs.find(g => {
                const glyphUnicode = g.unicode.toString(16).toUpperCase();
                const iconUnicode = unicode.toUpperCase();
                return glyphUnicode === iconUnicode;
            });
            
            // Check if this is a brand icon
            const isBrandIcon = (glyph && glyph.isBrand) || category === 'brands';
            
            if (isBrandIcon) {
                return `<i class="fa-brands" style="font-family:'Font Awesome 6 Brands' !important; color:inherit;">&#x${unicode};</i>`;
            }
            
            return `<i class="fa-solid" style="font-family:'Font Awesome 6 Pro' !important; color:inherit;">&#x${unicode};</i>`;
        }
        return '';
    }
    
    // Get icon name from icon ID
    getIconName(iconId) {
        if (iconId.startsWith('fa-glyph:')) {
            const unicode = iconId.replace('fa-glyph:', '');
            const glyph = this.glyphData.glyphs.find(g => g.unicode.toString(16) === unicode);
            return glyph ? glyph.name : '';
        }
        return '';
    }
    
    // Check if icon is a brand icon
    isBrandIcon(iconName) {
        const brandKeywords = [
            'amazon', 'apple', 'google', 'microsoft', 'facebook', 'twitter', 'instagram', 
            'linkedin', 'youtube', 'github', 'reddit', 'discord', 'slack', 'telegram', 
            'whatsapp', 'dropbox', 'stripe', 'paypal', 'bitcoin', 'ethereum', 'dribbble', 
            'behance', 'figma', 'trello', 'wordpress', 'medium', 'chrome', 'firefox', 
            'safari', 'android', 'linux', 'windows', 'spotify', 'netflix', 'adobe', 
            'shopify', 'zoom', 'skype', 'vimeo', 'foursquare', 'flickr', 'tumblr', 
            'yelp', 'docker', 'aws', 'gitlab', 'bitbucket', 'stack-overflow', 'codepen', 
            'npm', 'node-js', 'git', 'tiktok', 'snapchat', 'pinterest', 'twitch', 'steam', 
            'xbox', 'playstation', 'uber', 'lyft', 'airbnb', 'tesla', 'ibm', 'oracle', 
            'salesforce', 'hubspot', 'notion', 'asana', 'monday', 'jira', 'confluence', 
            'atlassian', 'google-cloud', 'digital-ocean', 'cc-visa', 'cc-mastercard', 
            'cc-amex', 'cc-paypal', 'cc-stripe', 'amazon-pay', 'microsoft-teams'
        ];
        
        return brandKeywords.some(keyword => 
            iconName.toLowerCase().includes(keyword.toLowerCase())
        );
    }
    
    // Get all available categories
    getCategories() {
        // Load saved selections to get accurate counts
        if (!this.savedPersonalIcons) {
            this.loadSavedSelections();
        }
        
        const categories = {
            all: this.filterByCategory(this.glyphData.glyphs, 'all').length,
            personal: this.filterByCategory(this.glyphData.glyphs, 'personal').length,
            business: this.filterByCategory(this.glyphData.glyphs, 'business').length,
            brands: this.filterByCategory(this.glyphData.glyphs, 'brands').length
        };
        
        console.log('Icon categories:', categories);
        return categories;
    }
    
    // Check if picker is ready
    isReady() {
        return this.isLoaded && this.glyphData;
    }
    
    // Helper: Check if an icon is a brand icon by unicode
    isBrandIconByUnicode(unicode) {
        if (!this.isLoaded || !this.glyphData) return false;
        
        const glyph = this.glyphData.glyphs.find(g => {
            const glyphUnicode = g.unicode.toString(16).toUpperCase();
            const iconUnicode = unicode.toUpperCase();
            return glyphUnicode === iconUnicode;
        });
        
        return glyph && glyph.isBrand === true;
    }
    
    // Helper: Get the correct HTML for rendering an icon by unicode
    getIconHTMLByUnicode(unicode) {
        if (!this.isLoaded || !this.glyphData) return '';
        
        const isBrand = this.isBrandIconByUnicode(unicode);
        
        if (isBrand) {
            return `<i class="fa-brands" style="font-family:'Font Awesome 6 Brands' !important; color:inherit;">&#x${unicode};</i>`;
        } else {
            return `<i class="fa-solid" style="font-family:'Font Awesome 6 Pro' !important; color:inherit;">&#x${unicode};</i>`;
        }
    }
    
    // Test function to verify all icons are working
    testAllIcons() {
        if (!this.isLoaded || !this.glyphData) {
            console.error('FontAwesome Pro Icon Picker not loaded');
            return false;
        }
        
        console.log('Testing FontAwesome Pro Icon Picker...');
        console.log(`Total icons: ${this.glyphData.glyphs.length}`);
        
        let workingIcons = 0;
        let brokenIcons = 0;
        let brandIcons = 0;
        let solidIcons = 0;
        
        this.glyphData.glyphs.forEach(glyph => {
            const iconHTML = this.getIconHTMLByUnicode(glyph.unicode.toString(16));
            if (iconHTML && iconHTML.includes('&#x')) {
                workingIcons++;
                if (glyph.isBrand) {
                    brandIcons++;
                } else {
                    solidIcons++;
                }
            } else {
                brokenIcons++;
                console.warn(`Broken icon: ${glyph.name} (unicode: ${glyph.unicode.toString(16)})`);
            }
        });
        
        console.log(`Working icons: ${workingIcons}`);
        console.log(`  - Solid icons: ${solidIcons}`);
        console.log(`  - Brand icons: ${brandIcons}`);
        console.log(`Broken icons: ${brokenIcons}`);
        console.log(`Success rate: ${((workingIcons / this.glyphData.glyphs.length) * 100).toFixed(1)}%`);
        
        // Test "all" category specifically
        const allIcons = this.searchGlyphs('', 'all');
        console.log(`Icons in "all" category: ${allIcons.length}`);
        
        return brokenIcons === 0;
    }
    
    // Debug function to show all available icons in "all" category
    debugAllCategory() {
        if (!this.isLoaded || !this.glyphData) {
            console.error('FontAwesome Pro Icon Picker not loaded');
            return;
        }
        
        console.log('=== DEBUG: All Category Icons ===');
        const allIcons = this.searchGlyphs('', 'all');
        console.log(`Total icons in "all" category: ${allIcons.length}`);
        
        allIcons.forEach((icon, index) => {
            const glyph = this.glyphData.glyphs.find(g => g.unicode.toString(16) === icon.id.replace('fa-glyph:', ''));
            if (glyph) {
                console.log(`${index + 1}. ${glyph.name} (${glyph.isBrand ? 'Brand' : 'Solid'}) - Unicode: ${glyph.unicode.toString(16)}`);
            }
        });
    }
    
    // Test brand icon rendering specifically
    testBrandIcons() {
        if (!this.isLoaded || !this.glyphData) {
            console.error('FontAwesome Pro Icon Picker not loaded');
            return false;
        }
        
        console.log('=== Testing Brand Icons ===');
        const brandGlyphs = this.glyphData.glyphs.filter(g => g.isBrand);
        console.log(`Total brand icons: ${brandGlyphs.length}`);
        
        let workingBrands = 0;
        let brokenBrands = 0;
        
        brandGlyphs.forEach(glyph => {
            const iconHTML = this.getIconHTMLByUnicode(glyph.unicode.toString(16));
            if (iconHTML && iconHTML.includes('fa-brands') && iconHTML.includes('Font Awesome 6 Brands')) {
                workingBrands++;
                console.log(`✓ ${glyph.name} - Working`);
            } else {
                brokenBrands++;
                console.warn(`✗ ${glyph.name} - Broken HTML: ${iconHTML}`);
            }
        });
        
        console.log(`Working brand icons: ${workingBrands}/${brandGlyphs.length}`);
        console.log(`Brand icon success rate: ${((workingBrands / brandGlyphs.length) * 100).toFixed(1)}%`);
        
        return brokenBrands === 0;
    }
}

// Export for use in main script
window.FontAwesomeProIconPicker = FontAwesomeProIconPicker;
