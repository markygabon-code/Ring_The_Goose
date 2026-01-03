export const GRAVITY = 0.6;
export const FRICTION = 0.98;
export const MAX_HOOPS = 5;

// Pseudo-3D mapping
export const PERSPECTIVE = 600; // Distance of camera
export const GROUND_Y_START = 400; // Screen Y where the 'floor' starts visually

// Physics
export const HOOP_RADIUS = 30; // Slightly larger
export const GOOSE_HITBOX_RADIUS = 35; // More forgiving
export const THROW_POWER_MULTIPLIER = 0.08; // Reduced to prevent overshooting
export const MAX_DRAG_DISTANCE = 250; // Allow more fine-tuning

// Goose Behavior
export const GOOSE_SPEED = 1.5; // Slower
export const GOOSE_CHANGE_DIR_CHANCE = 0.01;
export const BOUNDARY_MARGIN = 50;

// Visuals
// REPLACE THESE URLS WITH YOUR OWN IMAGES
export const BACKGROUND_IMAGE_URL = 'https://images.unsplash.com/photo-1550951298-5c7b95a66b90?q=80&w=1920&auto=format&fit=crop'; 
export const GOOSE_IMAGE_URL = 'https://www.pngall.com/wp-content/uploads/5/Goose-PNG-Image.png'; // Realistic White Goose
export const HOOP_IMAGE_URL = '';  // e.g., 'https://your-domain.com/ring.png' (Leave empty for default procedural hoop)