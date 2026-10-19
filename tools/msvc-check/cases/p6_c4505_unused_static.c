/* expect: none (MSVC at /W4 does not warn about an unused static function) */
static int helper(void) { return 1; }
int main(void) { return 0; }
