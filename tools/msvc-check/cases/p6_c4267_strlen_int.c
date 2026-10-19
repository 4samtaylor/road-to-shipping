/* expect: C4267 */
#include <string.h>
int main(void) { const char *s = "hi"; int n = strlen(s); return n; }
