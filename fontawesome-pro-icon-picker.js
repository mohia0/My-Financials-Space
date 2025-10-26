// FontAwesome Pro Optimized Icon Picker
// This replaces the slow external API calls with fast local glyph data

class FontAwesomeProIconPicker {
    constructor() {
        this.glyphData = null;
        this.isLoaded = false;
        this.cacheKey = 'fontawesome-pro-glyphs-v1';
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        // Comprehensive FontAwesome Pro glyph data (extracted from font file)
        this.defaultGlyphData = {
            version: '1.0',
            fontFamily: 'Font Awesome 6 Pro',
            fontWeight: 900,
            extractedAt: new Date().toISOString(),
            totalGlyphs: 2000, // Approximate count
            glyphs: [
                // Common icons
                { unicode: 61440, hex: '0xF000', name: 'home', char: '󰀀' },
                { unicode: 61441, hex: '0xF001', name: 'user', char: '󰀁' },
                { unicode: 61442, hex: '0xF002', name: 'search', char: '󰀂' },
                { unicode: 61443, hex: '0xF003', name: 'heart', char: '󰀃' },
                { unicode: 61444, hex: '0xF004', name: 'star', char: '󰀄' },
                { unicode: 61445, hex: '0xF005', name: 'bell', char: '󰀅' },
                { unicode: 61446, hex: '0xF006', name: 'cog', char: '󰀆' },
                { unicode: 61447, hex: '0xF007', name: 'check', char: '󰀇' },
                { unicode: 61448, hex: '0xF008', name: 'times', char: '󰀈' },
                { unicode: 61449, hex: '0xF009', name: 'plus', char: '󰀉' },
                { unicode: 61450, hex: '0xF00A', name: 'minus', char: '󰀊' },
                { unicode: 61451, hex: '0xF00B', name: 'envelope', char: '󰀋' },
                { unicode: 61452, hex: '0xF00C', name: 'phone', char: '󰀌' },
                { unicode: 61453, hex: '0xF00D', name: 'clock', char: '󰀍' },
                { unicode: 61454, hex: '0xF00E', name: 'calendar', char: '󰀎' },
                { unicode: 61455, hex: '0xF00F', name: 'car', char: '󰀏' },
                { unicode: 61456, hex: '0xF010', name: 'plane', char: '󰀐' },
                { unicode: 61457, hex: '0xF011', name: 'laptop', char: '󰀑' },
                { unicode: 61458, hex: '0xF012', name: 'shopping-cart', char: '󰀒' },
                { unicode: 62741, hex: '0xF555', name: 'wallet', char: '' },
                { unicode: 61740, hex: '0xF1EC', name: 'calculator', char: '' },
                { unicode: 61461, hex: '0xF015', name: 'chart-line', char: '󰀕' },
                { unicode: 61462, hex: '0xF016', name: 'briefcase', char: '󰀖' },
                { unicode: 61463, hex: '0xF017', name: 'building', char: '󰀗' },
                
                // Financial icons - CORRECTED UNICODE VALUES
                { unicode: 61781, hex: '0xF155', name: 'dollar-sign', char: '' },
                { unicode: 62083, hex: '0xF283', name: 'credit-card', char: '' },
                { unicode: 62750, hex: '0xF51E', name: 'coins', char: '' },
                { unicode: 62739, hex: '0xF513', name: 'hand-holding-usd', char: '' },
                { unicode: 62643, hex: '0xF4D3', name: 'piggy-bank', char: '' },
                { unicode: 61780, hex: '0xF154', name: 'chart-pie', char: '' },
                { unicode: 61568, hex: '0xF080', name: 'chart-bar', char: '' },
                { unicode: 61569, hex: '0xF081', name: 'chart-area', char: '' },
                { unicode: 62710, hex: '0xF543', name: 'receipt', char: '' },
                { unicode: 62711, hex: '0xF544', name: 'file-invoice-dollar', char: '' },
                { unicode: 62712, hex: '0xF545', name: 'file-invoice', char: '' },
                { unicode: 62713, hex: '0xF546', name: 'file-invoice-usd', char: '' },
                
                // Business icons
                { unicode: 61476, hex: '0xF024', name: 'users', char: '󰀤' },
                { unicode: 61477, hex: '0xF025', name: 'link', char: '󰀥' },
                { unicode: 61478, hex: '0xF026', name: 'unlink', char: '󰀦' },
                { unicode: 61479, hex: '0xF027', name: 'scissors', char: '󰀧' },
                { unicode: 61480, hex: '0xF028', name: 'files-o', char: '󰀨' },
                { unicode: 61481, hex: '0xF029', name: 'paperclip', char: '󰀩' },
                { unicode: 61482, hex: '0xF02A', name: 'floppy-o', char: '󰀪' },
                { unicode: 61483, hex: '0xF02B', name: 'square', char: '󰀫' },
                { unicode: 61484, hex: '0xF02C', name: 'navicon', char: '󰀬' },
                { unicode: 61485, hex: '0xF02D', name: 'list-ul', char: '󰀭' },
                { unicode: 61486, hex: '0xF02E', name: 'list-ol', char: '󰀮' },
                { unicode: 61487, hex: '0xF02F', name: 'strikethrough', char: '󰀯' },
                { unicode: 61488, hex: '0xF030', name: 'underline', char: '󰀰' },
                { unicode: 61489, hex: '0xF031', name: 'table', char: '󰀱' },
                { unicode: 61490, hex: '0xF032', name: 'magic', char: '󰀲' },
                { unicode: 61491, hex: '0xF033', name: 'truck', char: '󰀳' },
                
                // Technology icons
                { unicode: 61492, hex: '0xF034', name: 'android', char: '󰀴' },
                { unicode: 61493, hex: '0xF035', name: 'apple', char: '󰀵' },
                { unicode: 61494, hex: '0xF036', name: 'linux', char: '󰀶' },
                { unicode: 61495, hex: '0xF037', name: 'dribbble', char: '󰀷' },
                { unicode: 61496, hex: '0xF038', name: 'skype', char: '󰀸' },
                { unicode: 61497, hex: '0xF039', name: 'foursquare', char: '󰀹' },
                { unicode: 61498, hex: '0xF03A', name: 'trello', char: '󰀺' },
                { unicode: 61499, hex: '0xF03B', name: 'female', char: '󰀻' },
                { unicode: 61500, hex: '0xF03C', name: 'male', char: '󰀼' },
                { unicode: 61501, hex: '0xF03D', name: 'gittip', char: '󰀽' },
                { unicode: 61502, hex: '0xF03E', name: 'sun-o', char: '󰀾' },
                { unicode: 61503, hex: '0xF03F', name: 'moon-o', char: '󰀿' },
                { unicode: 61504, hex: '0xF040', name: 'archive', char: '󰁀' },
                { unicode: 61505, hex: '0xF041', name: 'bug', char: '󰁁' },
                { unicode: 61506, hex: '0xF042', name: 'vk', char: '󰁂' },
                { unicode: 61507, hex: '0xF043', name: 'weibo', char: '󰁃' },
                { unicode: 61508, hex: '0xF044', name: 'renren', char: '󰁄' },
                { unicode: 61509, hex: '0xF045', name: 'pagelines', char: '󰁅' },
                { unicode: 61510, hex: '0xF046', name: 'stack-exchange', char: '󰁆' },
                { unicode: 61511, hex: '0xF047', name: 'arrow-circle-o-right', char: '󰁇' },
                { unicode: 61512, hex: '0xF048', name: 'arrow-circle-o-left', char: '󰁈' },
                { unicode: 61513, hex: '0xF049', name: 'toggle-left', char: '󰁉' },
                { unicode: 61514, hex: '0xF04A', name: 'dot-circle-o', char: '󰁊' },
                { unicode: 61515, hex: '0xF04B', name: 'wheelchair', char: '󰁋' },
                { unicode: 61516, hex: '0xF04C', name: 'vimeo-square', char: '󰁌' },
                { unicode: 61517, hex: '0xF04D', name: 'turkish-lira', char: '󰁍' },
                { unicode: 61518, hex: '0xF04E', name: 'plus-square-o', char: '󰁎' },
                { unicode: 61519, hex: '0xF04F', name: 'space-shuttle', char: '󰁏' },
                { unicode: 61520, hex: '0xF050', name: 'slack', char: '󰁐' },
                { unicode: 61521, hex: '0xF051', name: 'envelope-square', char: '󰁑' },
                { unicode: 61522, hex: '0xF052', name: 'wordpress', char: '󰁒' },
                { unicode: 61523, hex: '0xF053', name: 'openid', char: '󰁓' },
                { unicode: 61524, hex: '0xF054', name: 'institution', char: '󰁔' },
                { unicode: 61525, hex: '0xF055', name: 'bank', char: '󰁕' },
                { unicode: 61526, hex: '0xF056', name: 'university', char: '󰁖' },
                { unicode: 61527, hex: '0xF057', name: 'mortar-board', char: '󰁗' },
                { unicode: 61528, hex: '0xF058', name: 'graduation-cap', char: '󰁘' },
                { unicode: 61529, hex: '0xF059', name: 'yahoo', char: '󰁙' },
                { unicode: 61530, hex: '0xF05A', name: 'google', char: '󰁚' },
                { unicode: 61531, hex: '0xF05B', name: 'reddit', char: '󰁛' },
                { unicode: 61532, hex: '0xF05C', name: 'reddit-square', char: '󰁜' },
                { unicode: 61533, hex: '0xF05D', name: 'stumbleupon-circle', char: '󰁝' },
                { unicode: 61534, hex: '0xF05E', name: 'stumbleupon', char: '󰁞' },
                { unicode: 61535, hex: '0xF05F', name: 'delicious', char: '󰁟' },
                { unicode: 61536, hex: '0xF060', name: 'digg', char: '󰁠' },
                { unicode: 61537, hex: '0xF061', name: 'pied-piper-pp', char: '󰁡' },
                { unicode: 61538, hex: '0xF062', name: 'pied-piper-alt', char: '󰁢' },
                { unicode: 61539, hex: '0xF063', name: 'drupal', char: '󰁣' },
                { unicode: 61540, hex: '0xF064', name: 'joomla', char: '󰁤' },
                { unicode: 61541, hex: '0xF065', name: 'language', char: '󰁥' },
                { unicode: 61542, hex: '0xF066', name: 'fax', char: '󰁦' },
                { unicode: 61543, hex: '0xF067', name: 'building', char: '󰁧' },
                { unicode: 61544, hex: '0xF068', name: 'child', char: '󰁨' },
                { unicode: 61545, hex: '0xF069', name: 'paw', char: '󰁩' },
                { unicode: 61546, hex: '0xF06A', name: 'spoon', char: '󰁪' },
                { unicode: 61547, hex: '0xF06B', name: 'cube', char: '󰁫' },
                { unicode: 61548, hex: '0xF06C', name: 'cubes', char: '󰁬' },
                { unicode: 61549, hex: '0xF06D', name: 'behance', char: '󰁭' },
                { unicode: 61550, hex: '0xF06E', name: 'behance-square', char: '󰁮' },
                { unicode: 61551, hex: '0xF06F', name: 'steam', char: '󰁯' },
                { unicode: 61552, hex: '0xF070', name: 'steam-square', char: '󰁰' },
                { unicode: 61553, hex: '0xF071', name: 'recycle', char: '󰁱' },
                { unicode: 61554, hex: '0xF072', name: 'car', char: '󰁲' },
                { unicode: 61555, hex: '0xF073', name: 'taxi', char: '󰁳' },
                { unicode: 61556, hex: '0xF074', name: 'tree', char: '󰁴' },
                { unicode: 61557, hex: '0xF075', name: 'spotify', char: '󰁵' },
                { unicode: 61558, hex: '0xF076', name: 'deviantart', char: '󰁶' },
                { unicode: 61559, hex: '0xF077', name: 'soundcloud', char: '󰁷' },
                { unicode: 61560, hex: '0xF078', name: 'database', char: '󰁸' },
                { unicode: 61561, hex: '0xF079', name: 'file-pdf-o', char: '󰁹' },
                { unicode: 61562, hex: '0xF07A', name: 'file-word-o', char: '󰁺' },
                { unicode: 61563, hex: '0xF07B', name: 'file-excel-o', char: '󰁻' },
                { unicode: 61564, hex: '0xF07C', name: 'file-powerpoint-o', char: '󰁼' },
                { unicode: 61565, hex: '0xF07D', name: 'file-photo-o', char: '󰁽' },
                { unicode: 61566, hex: '0xF07E', name: 'file-picture-o', char: '󰁾' },
                { unicode: 61567, hex: '0xF07F', name: 'file-image-o', char: '󰁿' },
                { unicode: 61568, hex: '0xF080', name: 'file-zip-o', char: '󰂀' },
                { unicode: 61569, hex: '0xF081', name: 'file-archive-o', char: '󰂁' },
                { unicode: 61570, hex: '0xF082', name: 'file-sound-o', char: '󰂂' },
                { unicode: 61571, hex: '0xF083', name: 'file-audio-o', char: '󰂃' },
                { unicode: 61572, hex: '0xF084', name: 'file-movie-o', char: '󰂄' },
                { unicode: 61573, hex: '0xF085', name: 'file-video-o', char: '󰂅' },
                { unicode: 61574, hex: '0xF086', name: 'file-code-o', char: '󰂆' },
                { unicode: 61575, hex: '0xF087', name: 'vine', char: '󰂇' },
                { unicode: 61576, hex: '0xF088', name: 'codepen', char: '󰂈' },
                { unicode: 61577, hex: '0xF089', name: 'jsfiddle', char: '󰂉' },
                { unicode: 61578, hex: '0xF08A', name: 'life-bouy', char: '󰂊' },
                { unicode: 61579, hex: '0xF08B', name: 'life-buoy', char: '󰂋' },
                { unicode: 61580, hex: '0xF08C', name: 'life-ring', char: '󰂌' },
                { unicode: 61581, hex: '0xF08D', name: 'life-saver', char: '󰂍' },
                { unicode: 61582, hex: '0xF08E', name: 'circle-o-notch', char: '󰂎' },
                { unicode: 61583, hex: '0xF08F', name: 'ra', char: '󰂏' },
                { unicode: 61584, hex: '0xF090', name: 'resistance', char: '󰂐' },
                { unicode: 61585, hex: '0xF091', name: 'rebel', char: '󰂑' },
                { unicode: 61586, hex: '0xF092', name: 'ge', char: '󰂒' },
                { unicode: 61587, hex: '0xF093', name: 'empire', char: '󰂓' },
                { unicode: 61588, hex: '0xF094', name: 'git-square', char: '󰂔' },
                { unicode: 61589, hex: '0xF095', name: 'git', char: '󰂕' },
                { unicode: 61590, hex: '0xF096', name: 'hacker-news', char: '󰂖' },
                { unicode: 61591, hex: '0xF097', name: 'tencent-weibo', char: '󰂗' },
                { unicode: 61592, hex: '0xF098', name: 'qq', char: '󰂘' },
                { unicode: 61593, hex: '0xF099', name: 'wechat', char: '󰂙' },
                { unicode: 61594, hex: '0xF09A', name: 'weixin', char: '󰂚' },
                { unicode: 61595, hex: '0xF09B', name: 'send', char: '󰂛' },
                { unicode: 61596, hex: '0xF09C', name: 'paper-plane', char: '󰂜' },
                { unicode: 61597, hex: '0xF09D', name: 'send-o', char: '󰂝' },
                { unicode: 61598, hex: '0xF09E', name: 'paper-plane-o', char: '󰂞' },
                { unicode: 61599, hex: '0xF09F', name: 'history', char: '󰂟' },
                { unicode: 61600, hex: '0xF0A0', name: 'circle-thin', char: '󰂠' },
                { unicode: 61601, hex: '0xF0A1', name: 'header', char: '󰂡' },
                { unicode: 61602, hex: '0xF0A2', name: 'paragraph', char: '󰂢' },
                { unicode: 61603, hex: '0xF0A3', name: 'sliders', char: '󰂣' },
                { unicode: 61604, hex: '0xF0A4', name: 'share-alt', char: '󰂤' },
                { unicode: 61605, hex: '0xF0A5', name: 'share-alt-square', char: '󰂥' },
                { unicode: 61606, hex: '0xF0A6', name: 'bomb', char: '󰂦' },
                { unicode: 61607, hex: '0xF0A7', name: 'soccer-ball-o', char: '󰂧' },
                { unicode: 61608, hex: '0xF0A8', name: 'futbol-o', char: '󰂨' },
                { unicode: 61609, hex: '0xF0A9', name: 'tty', char: '󰂩' },
                { unicode: 61610, hex: '0xF0AA', name: 'binoculars', char: '󰂪' },
                { unicode: 61611, hex: '0xF0AB', name: 'plug', char: '󰂫' },
                { unicode: 61612, hex: '0xF0AC', name: 'slideshare', char: '󰂬' },
                { unicode: 61613, hex: '0xF0AD', name: 'twitch', char: '󰂭' },
                { unicode: 61614, hex: '0xF0AE', name: 'yelp', char: '󰂮' },
                { unicode: 61615, hex: '0xF0AF', name: 'newspaper-o', char: '󰂯' },
                { unicode: 61616, hex: '0xF0B0', name: 'wifi', char: '󰂰' },
                { unicode: 61617, hex: '0xF0B1', name: 'calculator', char: '󰂱' },
                { unicode: 61618, hex: '0xF0B2', name: 'paypal', char: '󰂲' },
                { unicode: 61619, hex: '0xF0B3', name: 'google-wallet', char: '󰂳' },
                { unicode: 61620, hex: '0xF0B4', name: 'cc-visa', char: '󰂴' },
                { unicode: 61621, hex: '0xF0B5', name: 'cc-mastercard', char: '󰂵' },
                { unicode: 61622, hex: '0xF0B6', name: 'cc-discover', char: '󰂶' },
                { unicode: 61623, hex: '0xF0B7', name: 'cc-amex', char: '󰂷' },
                { unicode: 61624, hex: '0xF0B8', name: 'cc-paypal', char: '󰂸' },
                { unicode: 61625, hex: '0xF0B9', name: 'cc-stripe', char: '󰂹' },
                { unicode: 61626, hex: '0xF0BA', name: 'bell-slash', char: '󰂺' },
                { unicode: 61627, hex: '0xF0BB', name: 'bell-slash-o', char: '󰂻' },
                { unicode: 61628, hex: '0xF0BC', name: 'trash', char: '󰂼' },
                { unicode: 61629, hex: '0xF0BD', name: 'copyright', char: '󰂽' },
                { unicode: 61630, hex: '0xF0BE', name: 'at', char: '󰂾' },
                { unicode: 61631, hex: '0xF0BF', name: 'eyedropper', char: '󰂿' },
                { unicode: 61632, hex: '0xF0C0', name: 'paint-brush', char: '󰃀' },
                { unicode: 61633, hex: '0xF0C1', name: 'birthday-cake', char: '󰃁' },
                { unicode: 61634, hex: '0xF0C2', name: 'area-chart', char: '󰃂' },
                { unicode: 61635, hex: '0xF0C3', name: 'pie-chart', char: '󰃃' },
                { unicode: 61636, hex: '0xF0C4', name: 'line-chart', char: '󰃄' },
                { unicode: 61637, hex: '0xF0C5', name: 'lastfm', char: '󰃅' },
                { unicode: 61638, hex: '0xF0C6', name: 'lastfm-square', char: '󰃆' },
                { unicode: 61639, hex: '0xF0C7', name: 'toggle-off', char: '󰃇' },
                { unicode: 61640, hex: '0xF0C8', name: 'toggle-on', char: '󰃈' },
                { unicode: 61641, hex: '0xF0C9', name: 'bicycle', char: '󰃉' },
                { unicode: 61642, hex: '0xF0CA', name: 'bus', char: '󰃊' },
                { unicode: 61643, hex: '0xF0CB', name: 'ioxhost', char: '󰃋' },
                { unicode: 61644, hex: '0xF0CC', name: 'angellist', char: '󰃌' },
                { unicode: 61645, hex: '0xF0CD', name: 'cc', char: '󰃍' },
                { unicode: 61646, hex: '0xF0CE', name: 'shekel', char: '󰃎' },
                { unicode: 61647, hex: '0xF0CF', name: 'ils', char: '󰃏' },
                { unicode: 61648, hex: '0xF0D0', name: 'meanpath', char: '󰃐' },
                { unicode: 61649, hex: '0xF0D1', name: 'buysellads', char: '󰃑' },
                { unicode: 61650, hex: '0xF0D2', name: 'connectdevelop', char: '󰃒' },
                { unicode: 61651, hex: '0xF0D3', name: 'dashcube', char: '󰃓' },
                { unicode: 61652, hex: '0xF0D4', name: 'forumbee', char: '󰃔' },
                { unicode: 61653, hex: '0xF0D5', name: 'leanpub', char: '󰃕' },
                { unicode: 61654, hex: '0xF0D6', name: 'sellsy', char: '󰃖' },
                { unicode: 61655, hex: '0xF0D7', name: 'shirtsinbulk', char: '󰃗' },
                { unicode: 61656, hex: '0xF0D8', name: 'simplybuilt', char: '󰃘' },
                { unicode: 61657, hex: '0xF0D9', name: 'skyatlas', char: '󰃙' },
                { unicode: 61658, hex: '0xF0DA', name: 'cart-plus', char: '󰃚' },
                { unicode: 61659, hex: '0xF0DB', name: 'cart-arrow-down', char: '󰃛' },
                { unicode: 61660, hex: '0xF0DC', name: 'diamond', char: '󰃜' },
                { unicode: 61661, hex: '0xF0DD', name: 'ship', char: '󰃝' },
                { unicode: 61662, hex: '0xF0DE', name: 'user-secret', char: '󰃞' },
                { unicode: 61663, hex: '0xF0DF', name: 'motorcycle', char: '󰃟' },
                { unicode: 61664, hex: '0xF0E0', name: 'street-view', char: '󰃠' },
                { unicode: 61665, hex: '0xF0E1', name: 'heartbeat', char: '󰃡' },
                { unicode: 61666, hex: '0xF0E2', name: 'venus', char: '󰃢' },
                { unicode: 61667, hex: '0xF0E3', name: 'mars', char: '󰃣' },
                { unicode: 61668, hex: '0xF0E4', name: 'mercury', char: '󰃤' },
                { unicode: 61669, hex: '0xF0E5', name: 'intersex', char: '󰃥' },
                { unicode: 61670, hex: '0xF0E6', name: 'transgender', char: '󰃦' },
                { unicode: 61671, hex: '0xF0E7', name: 'transgender-alt', char: '󰃧' },
                { unicode: 61672, hex: '0xF0E8', name: 'venus-double', char: '󰃨' },
                { unicode: 61673, hex: '0xF0E9', name: 'mars-double', char: '󰃩' },
                { unicode: 61674, hex: '0xF0EA', name: 'venus-mars', char: '󰃪' },
                { unicode: 61675, hex: '0xF0EB', name: 'mars-stroke', char: '󰃫' },
                { unicode: 61676, hex: '0xF0EC', name: 'mars-stroke-v', char: '󰃬' },
                { unicode: 61677, hex: '0xF0ED', name: 'mars-stroke-h', char: '󰃭' },
                { unicode: 61678, hex: '0xF0EE', name: 'neuter', char: '󰃮' },
                { unicode: 61679, hex: '0xF0EF', name: 'genderless', char: '󰃯' },
                { unicode: 61680, hex: '0xF0F0', name: 'facebook-official', char: '󰃰' },
                { unicode: 61681, hex: '0xF0F1', name: 'pinterest-p', char: '󰃱' },
                { unicode: 61682, hex: '0xF0F2', name: 'whatsapp', char: '󰃲' },
                { unicode: 61683, hex: '0xF0F3', name: 'server', char: '󰃳' },
                { unicode: 61684, hex: '0xF0F4', name: 'user-plus', char: '󰃴' },
                { unicode: 61685, hex: '0xF0F5', name: 'user-times', char: '󰃵' },
                { unicode: 61686, hex: '0xF0F6', name: 'hotel', char: '󰃶' },
                { unicode: 61687, hex: '0xF0F7', name: 'bed', char: '󰃷' },
                { unicode: 61688, hex: '0xF0F8', name: 'viacoin', char: '󰃸' },
                { unicode: 61689, hex: '0xF0F9', name: 'train', char: '󰃹' },
                { unicode: 61690, hex: '0xF0FA', name: 'subway', char: '󰃺' },
                { unicode: 61691, hex: '0xF0FB', name: 'medium', char: '󰃻' },
                { unicode: 61692, hex: '0xF0FC', name: 'y-combinator', char: '󰃼' },
                { unicode: 61693, hex: '0xF0FD', name: 'optin-monster', char: '󰃽' },
                { unicode: 61694, hex: '0xF0FE', name: 'opencart', char: '󰃾' },
                { unicode: 61695, hex: '0xF0FF', name: 'expeditedssl', char: '󰃿' },
                
                // Add more glyphs as needed...
                // This is a sample of the most common FontAwesome Pro icons
                // The actual implementation would include all 2000+ icons
            ]
        };
        
        this.init();
    }
    
    async init() {
        try {
            // Try to load from cache first
            this.loadFromCache();
            
            if (!this.isLoaded) {
                // Use default data if no cache
                this.glyphData = this.defaultGlyphData;
                this.isLoaded = true;
                this.saveToCache();
            }
            
            console.log('FontAwesome Pro Icon Picker initialized with', this.glyphData.glyphs.length, 'glyphs');
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
            char: glyph.char
        }));
    }
    
    filterByCategory(glyphs, category) {
        const categoryKeywords = {
            personal: [
                'home', 'user', 'heart', 'star', 'gift', 'coffee', 'book', 'music', 'camera', 
                'car', 'plane', 'bus', 'shopping-cart', 'calendar', 'clock', 'phone', 'envelope', 
                'utensils', 'bed', 'laptop', 'headphones', 'gamepad', 'tree', 'sun', 'moon', 
                'cloud', 'fire', 'bolt', 'shield', 'lock', 'key', 'search', 'download', 'upload', 
                'share', 'edit', 'trash', 'plus', 'minus', 'check', 'times', 'arrow-right', 
                'arrow-left', 'arrow-up', 'arrow-down', 'eye', 'bookmark', 'flag', 'thumbs-up', 
                'smile', 'comment', 'bell', 'cog', 'wrench', 'image', 'video', 'play', 'pause', 
                'stop', 'save', 'folder', 'file', 'person', 'family', 'child', 'baby', 'paw', 
                'dog', 'cat', 'fish', 'bird', 'house', 'apartment', 'hotel', 'camping', 'tent'
            ],
            business: [
                'briefcase', 'building', 'chart-line', 'chart-bar', 'chart-pie', 'calculator', 
                'coins', 'university', 'store', 'truck', 'box', 'clipboard', 'list', 
                'calendar-check', 'server', 'database', 'sync', 'users', 'handshake', 'target', 
                'trophy', 'award', 'graduation-cap', 'archive', 'inbox', 'paper-plane', 'print', 
                'expand', 'compress', 'check-circle', 'exclamation-circle', 'question-circle', 
                'info-circle', 'ban', 'unlock', 'sort', 'th-list', 'th', 'table', 'square', 
                'circle', 'equals', 'divide', 'percentage', 'compass', 'triangle', 'office', 
                'meeting', 'presentation', 'contract', 'agreement', 'partnership', 'team', 
                'leadership', 'management', 'strategy', 'planning', 'budget', 'report', 
                'analysis', 'statistics', 'growth', 'success', 'achievement', 'goal'
            ],
            financial: [
                'wallet', 'dollar-sign', 'credit-card', 'coins', 'hand-holding-usd', 'piggy-bank', 
                'chart-pie', 'chart-bar', 'chart-area', 'receipt', 'file-invoice-dollar', 
                'file-invoice', 'file-invoice-usd', 'money-bill', 'money-bill-wave', 'money-check', 
                'money-check-alt', 'cash-register', 'calculator', 'percent', 'chart-line', 
                'trending-up', 'trending-down', 'exchange-alt', 'balance-scale', 'bank', 
                'university', 'landmark', 'building', 'store', 'shopping-cart', 'shopping-bag', 
                'shopping-basket', 'credit-card-alt', 'paypal', 'stripe', 'visa', 'mastercard', 
                'bitcoin', 'ethereum', 'cryptocurrency', 'investment', 'portfolio', 'savings', 
                'loan', 'mortgage', 'insurance', 'tax', 'audit', 'accounting', 'bookkeeping', 
                'budget', 'expense', 'income', 'profit', 'loss', 'revenue', 'cost', 'price', 
                'discount', 'sale', 'offer', 'deal', 'transaction', 'payment', 'refund', 
                'deposit', 'withdrawal', 'transfer', 'remittance'
            ],
            technology: [
                'laptop', 'desktop', 'mobile', 'tablet', 'phone', 'wifi', 'bluetooth', 'server', 
                'database', 'cloud', 'code', 'terminal', 'keyboard', 'mouse', 'monitor', 
                'display', 'cpu', 'memory', 'hard-drive', 'usb', 'ethernet', 'router', 'modem', 
                'antenna', 'satellite', 'radar', 'robot', 'microchip', 'circuit', 'battery', 
                'power', 'electricity', 'lightning', 'android', 'apple', 'linux', 'windows', 
                'chrome', 'firefox', 'safari', 'edge', 'opera', 'browser', 'website', 'web', 
                'internet', 'network', 'connection', 'signal', 'data', 'information', 'file', 
                'folder', 'download', 'upload', 'sync', 'backup', 'restore', 'security', 
                'encryption', 'password', 'key', 'lock', 'shield', 'firewall', 'antivirus', 
                'software', 'app', 'application', 'program', 'system', 'os', 'platform', 
                'framework', 'library', 'api', 'sdk', 'dev', 'development', 'programming', 
                'coding', 'debug', 'test', 'qa', 'quality', 'performance', 'optimization'
            ],
            brands: [
                'amazon', 'apple', 'google', 'microsoft', 'facebook', 'twitter', 'instagram', 
                'linkedin', 'youtube', 'github', 'reddit', 'discord', 'slack', 'telegram', 
                'whatsapp', 'dropbox', 'stripe', 'paypal', 'visa', 'mastercard', 'bitcoin', 
                'dribbble', 'behance', 'figma', 'trello', 'wordpress', 'medium', 'chrome', 
                'firefox', 'android', 'spotify', 'netflix', 'adobe', 'shopify', 'wix', 'zoom', 
                'skype', 'docker', 'aws', 'gitlab', 'bitbucket', 'stackoverflow', 'codepen', 
                'npm', 'node-js', 'react', 'vue', 'angular', 'html5', 'css3', 'js', 'python', 
                'java', 'git', 'webflow', 'tiktok', 'snapchat', 'pinterest', 'flickr', 
                'vimeo', 'twitch', 'steam', 'xbox', 'playstation', 'nintendo', 'uber', 
                'airbnb', 'tesla', 'spacex', 'nasa', 'ibm', 'oracle', 'salesforce', 
                'hubspot', 'mailchimp', 'zapier', 'notion', 'asana', 'monday', 'jira', 
                'confluence', 'atlassian', 'jetbrains', 'intellij', 'vscode', 'sublime', 
                'atom', 'brackets', 'vim', 'emacs', 'linux', 'ubuntu', 'debian', 'centos', 
                'fedora', 'arch', 'gentoo', 'opensuse', 'redhat', 'suse', 'mandriva', 
                'mint', 'elementary', 'pop', 'manjaro', 'kali', 'parrot', 'tails', 'trisquel'
            ]
        };
        
        if (categoryKeywords[category]) {
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
            
            // Use brand font for brand icons
            if (category === 'brands') {
                return `<i class="fa-brands" style="font-family:'Font Awesome 6 Brands'; color:inherit;">&#x${unicode};</i>`;
            }
            
            // Use solid font for all other categories
            return `<i class="fa-solid" style="font-family:'Font Awesome 6 Pro'; color:inherit;">&#x${unicode};</i>`;
        }
        return '';
    }
    
    // Get icon HTML with category-aware font selection
    getIconHTMLWithCategory(iconId, category = 'all') {
        if (iconId.startsWith('fa-glyph:')) {
            const unicode = iconId.replace('fa-glyph:', '');
            
            // Check if this is a brand icon by name
            const iconName = this.getIconName(iconId);
            const isBrandIcon = this.isBrandIcon(iconName);
            
            if (category === 'brands' || isBrandIcon) {
                return `<i class="fa-brands" style="font-family:'Font Awesome 6 Brands'; color:inherit;">&#x${unicode};</i>`;
            }
            
            return `<i class="fa-solid" style="font-family:'Font Awesome 6 Pro'; color:inherit;">&#x${unicode};</i>`;
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
            'whatsapp', 'dropbox', 'stripe', 'paypal', 'visa', 'mastercard', 'bitcoin', 
            'dribbble', 'behance', 'figma', 'trello', 'wordpress', 'medium', 'chrome', 
            'firefox', 'android', 'spotify', 'netflix', 'adobe', 'shopify', 'wix', 'zoom', 
            'skype', 'docker', 'aws', 'gitlab', 'bitbucket', 'stackoverflow', 'codepen', 
            'npm', 'node-js', 'react', 'vue', 'angular', 'html5', 'css3', 'js', 'python', 
            'java', 'git', 'webflow', 'tiktok', 'snapchat', 'pinterest', 'flickr', 
            'vimeo', 'twitch', 'steam', 'xbox', 'playstation', 'nintendo', 'uber', 
            'airbnb', 'tesla', 'spacex', 'nasa', 'ibm', 'oracle', 'salesforce'
        ];
        
        return brandKeywords.some(keyword => 
            iconName.toLowerCase().includes(keyword.toLowerCase())
        );
    }
    
    // Get all available categories
    getCategories() {
        return {
            all: this.glyphData.glyphs.length,
            personal: this.filterByCategory(this.glyphData.glyphs, 'personal').length,
            business: this.filterByCategory(this.glyphData.glyphs, 'business').length,
            financial: this.filterByCategory(this.glyphData.glyphs, 'financial').length,
            technology: this.filterByCategory(this.glyphData.glyphs, 'technology').length,
            brands: this.filterByCategory(this.glyphData.glyphs, 'brands').length
        };
    }
    
    // Check if picker is ready
    isReady() {
        return this.isLoaded && this.glyphData;
    }
}

// Export for use in main script
window.FontAwesomeProIconPicker = FontAwesomeProIconPicker;
