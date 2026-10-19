/* expect: C4244 */
#include <ctype.h>
int main(void) { char c = 'a'; c = toupper((unsigned char)c); return c; }
