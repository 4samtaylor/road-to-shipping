/* expect: C4996 */
#include <string.h>
int main(void) { char a[8] = "a"; strncat(a, "hi", 1); return a[0]; }
