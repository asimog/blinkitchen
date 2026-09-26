/**
 * Catalog data plan for the Blinkit Recipes harvest.
 *
 * Canonical ingredient vocabulary. Existing canonical ids (authored in the
 * original fixture set) are never renamed: new ingredients are additive and
 * aliases only exist for offline ingestion, never for runtime lookups.
 */

export const aliasOverrides = {
  onion: ["pyaz", "kanda", "onions"],
  tomato: ["tamatar", "tomatoes"],
  potato: ["aloo", "batata", "potatoes"],
  spinach: ["palak", "spinach leaves"],
  garlic: ["lehsun", "lasan", "garlic cloves"],
  ginger: ["adrak", "ginger paste", "ginger garlic paste"],
  green_chili: ["hari mirch", "green chilli", "green chillies", "mirchi", "chilli", "chilies"],
  cauliflower: ["gobhi", "gobi", "phool gobhi"],
  green_peas: ["matar", "peas", "green peas", "hari matar"],
  carrot: ["gajar", "carrots"],
  coriander: ["dhania", "cilantro", "coriander leaves", "hara dhania"],
  paneer: ["cottage cheese", "paneer cubes"],
  yogurt: ["curd", "dahi", "yoghurt", "yogurt", "plain curd"],
  tofu: ["bean curd"],
  rajma: ["kidney beans", "red kidney beans"],
  chana: ["chickpeas", "kabuli chana", "white chana"],
  moong_dal: ["green gram", "mung dal", "moong dal", "yellow moong dal"],
  toor_dal: ["arhar dal", "tuvar dal", "pigeon peas", "toor dal"],
  rice: ["chawal", "basmati rice", "basmati", "steamed rice"],
  atta: ["wheat flour", "whole wheat flour", "gehun atta", "chakki atta"],
  poha: ["flattened rice", "beaten rice", "aval"],
  oil: ["oil", "cooking oil", "refined oil", "vegetable oil", "sunflower oil"],
  ghee: ["clarified butter", "desi ghee"],
  cumin: ["jeera", "cumin seeds"],
  turmeric: ["haldi", "turmeric powder"],
  garam_masala: ["garam masala powder"],
  salt: ["namak", "table salt", "edible salt"],
  red_chili_powder: ["lal mirch", "red chilli powder", "red chilli", "chilli powder"],
  lemon: ["nimbu", "lemon juice"],
  peanuts: ["groundnut", "moongphali", "peanut"],
  curry_leaves: ["kadi patta", "meetha neem", "curry leaf"],
  mustard_seeds: ["rai", "sarson seeds", "mustard seed"],
  bay_leaf: ["tej patta", "bay leaves"],
  coriander_powder: ["dhania powder", "ground coriander"],
  amchur: ["dry mango powder", "amchoor"],
  ajwain: ["carom seeds", "bishop's weed"],
  bread: ["bread slices", "brown bread", "white bread"],
  cream: ["malai", "fresh cream", "cream"],
  hing: ["asafoetida", "asafoetida powder"],
  urad_dal: ["black gram", "urad dal", "split black gram"],
  chana_dal: ["bengal gram", "chana dal", "split chickpeas"],
  papad: ["papadum", "poppadom"],
  pickle: ["achar", "achaar", "mango pickle"],
  sugar: ["cheeni", "white sugar", "powdered sugar", "bura", "bura sugar"],
};

const vegetarian = ["vegetarian"];

const vegan = ["vegetarian", "vegan"];

/**
 * Additive canonical ingredients. `aliases` are ingestion metadata only: the
 * runtime never reads them.
 */
export const newIngredients = [
  // Vegetables
  { id: "cabbage", name: "Cabbage", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["patta gobhi", "band gobhi"] },
  { id: "capsicum", name: "Capsicum", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 10, staple: false, dietaryAttributes: vegan, aliases: ["bell pepper", "shimla mirch", "green capsicum", "red bell pepper", "yellow bell pepper"] },
  { id: "brinjal", name: "Brinjal", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 8, staple: false, dietaryAttributes: vegan, aliases: ["baingan", "eggplant", "aubergine"] },
  { id: "okra", name: "Okra", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 6, staple: false, dietaryAttributes: vegan, aliases: ["bhindi", "lady finger", "ladyfinger"] },
  { id: "bottle_gourd", name: "Bottle Gourd", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["lauki", "doodhi", "ghiya", "calabash"] },
  { id: "bitter_gourd", name: "Bitter Gourd", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 8, staple: false, dietaryAttributes: vegan, aliases: ["karela", "bitter melon"] },
  { id: "pumpkin", name: "Pumpkin", category: "vegetables", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 21, staple: false, dietaryAttributes: vegan, aliases: ["kaddu", "sitaphal"] },
  { id: "sweet_potato", name: "Sweet Potato", category: "vegetables", storageType: "shelf_stable", commonUnits: ["g", "piece"], shelfLifeDays: 21, staple: false, dietaryAttributes: vegan, aliases: ["shakarkandi"] },
  { id: "beetroot", name: "Beetroot", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["chukandar", "beet"] },
  { id: "radish", name: "Radish", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 10, staple: false, dietaryAttributes: vegan, aliases: ["mooli", "daikon", "white radish"] },
  { id: "cucumber", name: "Cucumber", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 8, staple: false, dietaryAttributes: vegan, aliases: ["kheera", "cucumbers"] },
  { id: "lettuce", name: "Lettuce", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 6, staple: false, dietaryAttributes: vegan, aliases: ["salad leaves", "iceberg lettuce"] },
  { id: "broccoli", name: "Broccoli", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegan, aliases: ["broccoli florets"] },
  { id: "mushroom", name: "Mushroom", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 5, staple: false, dietaryAttributes: vegan, aliases: ["mushrooms", "button mushroom"] },
  { id: "corn", name: "Sweet Corn", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 5, staple: false, dietaryAttributes: vegan, aliases: ["corn", "makka", "corn kernels", "baby corn"] },
  { id: "french_beans", name: "French Beans", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegan, aliases: ["beans", "green beans", "cluster beans", "gawar", "guar"] },
  { id: "drumstick", name: "Drumstick", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegan, aliases: ["sahjan", "moringa pods"] },
  { id: "raw_banana", name: "Raw Banana", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 10, staple: false, dietaryAttributes: vegan, aliases: ["kaccha kela", "plantain"] },
  { id: "spring_onion", name: "Spring Onion", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegan, aliases: ["scallion", "green onion", "hara pyaz"] },
  { id: "zucchini", name: "Zucchini", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 8, staple: false, dietaryAttributes: vegan, aliases: ["courgette"] },
  { id: "turnip", name: "Turnip", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["shalgam"] },
  { id: "arbi", name: "Colocasia", category: "vegetables", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["arbi", "taro root", "taro"] },
  { id: "parwal", name: "Pointed Gourd", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 6, staple: false, dietaryAttributes: vegan, aliases: ["parwal", "potol"] },
  { id: "mint", name: "Mint", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 5, staple: false, dietaryAttributes: vegan, aliases: ["pudina", "mint leaves", "fresh mint"] },
  { id: "methi_leaves", name: "Fenugreek Leaves", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["methi", "kasuri methi leaves", "fresh methi"] },
  { id: "dill", name: "Dill", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["shepu", "suva", "dill leaves"] },
  { id: "mustard_greens", name: "Mustard Greens", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["sarson", "sarson ka saag"] },
  { id: "amaranth", name: "Amaranth Leaves", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 3, staple: false, dietaryAttributes: vegan, aliases: ["chaulai", "lal saag"] },
  { id: "raw_mango", name: "Raw Mango", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 10, staple: false, dietaryAttributes: vegan, aliases: ["kaccha aam", "green mango"] },
  { id: "tamarind", name: "Tamarind", category: "pantry", storageType: "shelf_stable", commonUnits: ["g", "ml"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["imli", "tamarind pulp", "tamarind paste"] },

  // Dairy
  { id: "milk", name: "Milk", category: "dairy", storageType: "perishable", commonUnits: ["ml"], shelfLifeDays: 4, staple: true, dietaryAttributes: vegetarian, aliases: ["doodh", "toned milk", "full cream milk", "boiled milk"] },
  { id: "butter", name: "Butter", category: "dairy", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 60, staple: true, dietaryAttributes: vegetarian, aliases: ["makhan", "unsalted butter", "salted butter"] },
  { id: "cheese", name: "Cheese", category: "dairy", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 30, staple: false, dietaryAttributes: vegetarian, aliases: ["cheddar cheese", "mozzarella cheese", "processed cheese", "parmesan", "goat cheese"] },
  { id: "khoya", name: "Khoya", category: "dairy", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegetarian, aliases: ["mawa", "khoa", "khoya mawa"] },
  { id: "buttermilk", name: "Buttermilk", category: "dairy", storageType: "perishable", commonUnits: ["ml"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegetarian, aliases: ["chaas", "chhach", "mor"] },

  // Protein
  { id: "masoor_dal", name: "Masoor Dal", category: "protein", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: true, dietaryAttributes: vegan, aliases: ["red lentil", "masoor dal", "pink lentil"] },
  { id: "soya_chunks", name: "Soya Chunks", category: "protein", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["soya granules", "meal maker", "textured soy"] },
  { id: "lobia", name: "Lobia", category: "protein", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["black eyed peas", "black-eyed beans", "chawli"] },
  { id: "sprouts", name: "Sprouts", category: "protein", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["moong sprouts", "bean sprouts", "ankurit"] },
  { id: "sattu", name: "Sattu", category: "protein", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["roasted gram flour"] },

  // Pantry
  { id: "sooji", name: "Sooji", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: true, dietaryAttributes: vegan, aliases: ["rava", "semolina", "suji"] },
  { id: "besan", name: "Besan", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: true, dietaryAttributes: vegan, aliases: ["gram flour", "chickpea flour"] },
  { id: "maida", name: "Maida", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["all purpose flour", "refined flour", "plain flour"] },
  { id: "rice_flour", name: "Rice Flour", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["chawal ka atta"] },
  { id: "sabudana", name: "Sabudana", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["sago", "tapioca pearls"] },
  { id: "seviyan", name: "Seviyan", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["vermicelli", "semiya"] },
  { id: "noodles", name: "Noodles", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 270, staple: false, dietaryAttributes: vegan, aliases: ["hakka noodles", "egg noodles", "instant noodles"] },
  { id: "pasta", name: "Pasta", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["penne", "macaroni", "fusilli", "spaghetti"] },
  { id: "jaggery", name: "Jaggery", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["gud", "gur", "jaggery powder"] },
  { id: "sugar", name: "Sugar", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 730, staple: true, dietaryAttributes: vegan, aliases: ["cheeni", "white sugar", "powdered sugar", "bura", "bura sugar"] },
  { id: "honey", name: "Honey", category: "pantry", storageType: "shelf_stable", commonUnits: ["g", "ml"], shelfLifeDays: 730, staple: false, dietaryAttributes: vegan, aliases: ["shahad"] },
  { id: "coconut", name: "Coconut", category: "pantry", storageType: "shelf_stable", commonUnits: ["g", "piece"], shelfLifeDays: 30, staple: false, dietaryAttributes: vegan, aliases: ["nariyal", "fresh coconut", "grated coconut", "dry coconut", "copra"] },
  { id: "desiccated_coconut", name: "Desiccated Coconut", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["coconut powder"] },
  { id: "cashew", name: "Cashew", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["kaju", "cashews", "cashew nuts"] },
  { id: "almonds", name: "Almonds", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["badam", "almond"] },
  { id: "pistachio", name: "Pistachio", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["pista", "pistachios"] },
  { id: "raisins", name: "Raisins", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["kishmish", "dried grapes", "raisin"] },
  { id: "dates", name: "Dates", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["khajoor", "date"] },
  { id: "cocoa_powder", name: "Cocoa Powder", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["cocoa", "unsweetened cocoa"] },
  { id: "chocolate", name: "Chocolate", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegetarian, aliases: ["dark chocolate", "chocolate chips", "milk chocolate", "choco chips"] },
  { id: "cornflour", name: "Cornflour", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["corn starch", "cornstarch"] },
  { id: "baking_powder", name: "Baking Powder", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: [] },
  { id: "vinegar", name: "Vinegar", category: "pantry", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 730, staple: false, dietaryAttributes: vegan, aliases: ["white vinegar", "apple cider vinegar"] },
  { id: "soy_sauce", name: "Soy Sauce", category: "pantry", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["soya sauce"] },
  { id: "tomato_puree", name: "Tomato Puree", category: "pantry", storageType: "shelf_stable", commonUnits: ["g", "ml"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["tomato paste", "tomato ketchup"] },
  { id: "coconut_milk", name: "Coconut Milk", category: "pantry", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["nariyal milk"] },
  { id: "sesame", name: "Sesame Seeds", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["til", "white sesame seeds"] },
  { id: "makhana", name: "Makhana", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["fox nuts", "lotus seeds"] },
  { id: "sev", name: "Sev", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 90, staple: false, dietaryAttributes: vegan, aliases: ["namkeen sev", "bhujia", "nylon sev"] },

  // Fats
  { id: "mustard_oil", name: "Mustard Oil", category: "fat", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["sarson ka tel", "kachi ghani mustard oil"] },
  { id: "coconut_oil", name: "Coconut Oil", category: "fat", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["nariyal tel"] },
  { id: "olive_oil", name: "Olive Oil", category: "fat", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["extra virgin olive oil"] },
  { id: "sesame_oil", name: "Sesame Oil", category: "fat", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["til oil", "gingelly oil"] },

  // Spices
  { id: "black_pepper", name: "Black Pepper", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["kali mirch", "peppercorns", "pepper powder"] },
  { id: "cinnamon", name: "Cinnamon", category: "spice", storageType: "shelf_stable", commonUnits: ["g", "piece"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["dalchini", "cinnamon stick"] },
  { id: "cardamom", name: "Cardamom", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["elaichi", "green cardamom", "black cardamom"] },
  { id: "clove", name: "Clove", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["laung", "cloves"] },
  { id: "star_anise", name: "Star Anise", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["chakra phool"] },
  { id: "nutmeg", name: "Nutmeg", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["jaiphal"] },
  { id: "fenugreek_seeds", name: "Fenugreek Seeds", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["methi dana", "methi seeds"] },
  { id: "fennel", name: "Fennel Seeds", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["saunf", "fennel"] },
  { id: "kasuri_methi", name: "Kasuri Methi", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["dried fenugreek leaves"] },
  { id: "cumin_powder", name: "Cumin Powder", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["jeera powder", "ground cumin"] },
  { id: "chole_masala", name: "Chole Masala", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["chana masala", "chhole masala"] },
  { id: "pav_bhaji_masala", name: "Pav Bhaji Masala", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: [] },
  { id: "sambar_powder", name: "Sambar Powder", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["sambhar powder"] },
  { id: "rasam_powder", name: "Rasam Powder", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["rasam masala"] },
  { id: "chaat_masala", name: "Chaat Masala", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["chat masala"] },
  { id: "black_salt", name: "Black Salt", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 730, staple: false, dietaryAttributes: vegan, aliases: ["kala namak", "rock salt", "sendha namak"] },
  { id: "dried_red_chili", name: "Dried Red Chilli", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["sookhi lal mirch", "dry red chilli", "red chillies"] },
  { id: "green_cardamom", name: "Green Cardamom", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["choti elaichi", "hari elaichi"] },
  { id: "saffron", name: "Saffron", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["kesar", "zafran"] },
  { id: "rose_water", name: "Rose Water", category: "spice", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["gulab jal"] },

  // Baking, fruit and specialty items surfaced by the recipe harvest
  { id: "baking_soda", name: "Baking Soda", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["soda bicarbonate", "meetha soda"] },
  { id: "vanilla_extract", name: "Vanilla Extract", category: "pantry", storageType: "shelf_stable", commonUnits: ["ml"], shelfLifeDays: 730, staple: false, dietaryAttributes: vegan, aliases: ["vanilla essence"] },
  { id: "mixed_vegetables", name: "Mixed Vegetables", category: "vegetables", storageType: "frozen", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["frozen mixed vegetables", "mixed veg"] },
  { id: "dry_fruits", name: "Dry Fruits", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["dry fruit", "mixed dry fruits", "assorted dry fruits"] },
  { id: "cherry", name: "Cherry", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 7, staple: false, dietaryAttributes: vegan, aliases: ["cherries"] },
  { id: "strawberry", name: "Strawberry", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["strawberries"] },
  { id: "blueberry", name: "Blueberry", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 5, staple: false, dietaryAttributes: vegan, aliases: ["blueberries"] },
  { id: "walnut", name: "Walnut", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["walnuts", "akhrot"] },
  { id: "apple", name: "Apple", category: "vegetables", storageType: "perishable", commonUnits: ["g", "piece"], shelfLifeDays: 21, staple: false, dietaryAttributes: vegan, aliases: ["apples", "seb"] },
  { id: "orange", name: "Orange", category: "vegetables", storageType: "perishable", commonUnits: ["piece", "g"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["oranges", "santra", "mosambi"] },
  { id: "pomegranate", name: "Pomegranate", category: "vegetables", storageType: "perishable", commonUnits: ["piece", "g"], shelfLifeDays: 14, staple: false, dietaryAttributes: vegan, aliases: ["anar"] },
  { id: "plum", name: "Plum", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 10, staple: false, dietaryAttributes: vegan, aliases: ["plums", "aloo bukhara"] },
  { id: "poppy_seeds", name: "Poppy Seeds", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["khus khus", "posto"] },
  { id: "melon_seeds", name: "Melon Seeds", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["magaz", "watermelon seeds"] },
  { id: "kuttu_flour", name: "Kuttu Flour", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["buckwheat flour", "kuttu ka atta"] },
  { id: "bun", name: "Bun", category: "pantry", storageType: "perishable", commonUnits: ["piece", "g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegetarian, aliases: ["buns", "burger bun", "pav"] },
  { id: "pizza_sauce", name: "Pizza Sauce", category: "pantry", storageType: "shelf_stable", commonUnits: ["g", "ml"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["pizza base sauce", "pasta sauce"] },
  { id: "yeast", name: "Yeast", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["active dry yeast", "instant yeast"] },
  { id: "basil", name: "Basil", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 4, staple: false, dietaryAttributes: vegan, aliases: ["basil leaves", "tulsi", "holy basil"] },
  { id: "parsley", name: "Parsley", category: "vegetables", storageType: "perishable", commonUnits: ["g"], shelfLifeDays: 5, staple: false, dietaryAttributes: vegan, aliases: ["parsley leaves"] },
  { id: "oregano", name: "Oregano", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["oregano leaves", "dried oregano"] },
  { id: "mixed_herbs", name: "Mixed Herbs", category: "spice", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 365, staple: false, dietaryAttributes: vegan, aliases: ["italian seasoning", "herb mix"] },
  { id: "jowar_flour", name: "Jowar Flour", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["jowar atta", "sorghum flour"] },
  { id: "hazelnut", name: "Hazelnut", category: "pantry", storageType: "shelf_stable", commonUnits: ["g"], shelfLifeDays: 180, staple: false, dietaryAttributes: vegan, aliases: ["hazelnuts"] },
];

export const cuisineKeywords = [
  ["indo_chinese", ["chowmein", "noodles", "manchurian", "chilli", "schezwan", "hakka", "spring roll", "fried rice"]],
  ["south_indian", ["dosa", "idli", "upma", "rasam", "sambar", "vada", "uttapam", "pongal", "avial", "poriyal", "chettinad", "appam", "idiyappam", "pesara", "payasam", "puliyogare", "thogayal", "kesari"]],
  ["gujarati", ["dhokla", "thepla", "khaman", "handvo", "fafda", "undhiyu", "khakhra", "shrikhand", "dabeli"]],
  ["maharashtrian", ["pav bhaji", "misal", "puran poli", "vada pav", "thalipeeth", "sabudana", "modak", "pohe", "zunka", "pithla"]],
  ["bengali", ["mishti", "sandesh", "rasgulla", "doi", "luchi", "aloo posto", "cholar dal", "shukto"]],
  ["punjabi", ["paratha", "chole", "rajma", "paneer", "dal makhani", "sarson", "makki", "lassi", "kulcha", "naan", "amritsari"]],
  ["mughlai", ["korma", "biryani", "pulao", "nihari", "kofta", "makhani", "pasanda", "shahi"]],
  ["italian", ["pasta", "pizza", "penne", "macaroni", "risotto", "lasagna"]],
  ["continental", ["salad", "soup", "roasted", "baked", "frittata", "fries", "sandwich", "toast"]],
  ["mexican", ["mexican", "taco", "burrito", "quesadilla", "salsa"]],
  ["street_food", ["panipuri", "dabeli", "vada pav", "tikki", "chaat", "pakoda", "bhajiya", "kebab", "fries"]],
];

export const breakfastKeywords = ["paratha", "poha", "upma", "idli", "dosa", "thepla", "dhokla", "chilla", "puri", "bhurji", "toast", "sandwich", "omelette", "pancake", "cheela", "vada", "puttu", "appam", "shakshuka", "granola", "smoothie"];

export const lunchDinnerKeywords = ["dal", "sabzi", "curry", "masala", "rice", "roti", "pulao", "biryani", "kofta", "korma", "bhindi", "aloo", "paneer", "rajma", "chole", "noodles", "pasta", "soup", "bhurji", "tikki", "cutlet", "salad", "raita", "chutney", "tadka", "makhani", "handi", "fry", "fries", "naan", "kulcha", "paratha", "thepla", "dosa", "idli"];

export const dessertOrDrinkKeywords = [
  "cake", "candy", "laddu", "ladoo", "barfi", "burfi", "halwa", "kheer", "payasam", "ice cream", "kulfi", "falooda", "shake", "smoothie", "juice", "mojito", "mocktail", "tea", "coffee", "lassi", "thandai", "sherbet", "sherbet", "jamun", "jalebi", "gujiya", "malpua", "rasgulla", "rasmalai", "sandesh", "peda", "kalakand", "ghewar", "soan papdi", "mysore pak", "rabri", "shrikhand", "custard", "pudding", "modak", "brownie", "doughnut", "donut", "cupcake", "pastry", "murabba", "morraba", "pickle", "achar", "papad", "panchamrit", "charnamrit", "panakam", "kanji", "gulkand", "gujiya", "javey", "gud", "candy", "chocolate", "cocoa", "cookie", "biscuit", "waffle", "crepe", "fudge", "toffee", "gulab", "kaju katli", "soan", "trail mix", "granola bar", "thirst", "cider", "toddy", "mule", "spritz", "nog", "wine", "vodka", "cola", "soda", "coffee", "chai",
];

export const animalIngredientIds = new Set(["paneer", "yogurt", "ghee", "cream", "milk", "butter", "cheese", "khoya", "buttermilk", "chocolate"]);

export const defaultQuantities = {
  vegetables: { quantity: 200, unit: "g" },
  dairy: { quantity: 100, unit: "g" },
  protein: { quantity: 150, unit: "g" },
  pantry: { quantity: 100, unit: "g" },
  fat: { quantity: 15, unit: "ml" },
  spice: { quantity: 3, unit: "g" },
};
