const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("            </Suspense>\n      </AnimatePresence>\n          </motion.div>\n        )}", "            </AnimatePresence>\n          </motion.div>\n        )}");

fs.writeFileSync('src/App.tsx', content);
