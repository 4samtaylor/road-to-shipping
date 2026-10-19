/* expect: C4996 */
#include <string.h>
int main(void) { char a[8]; strcpy(a, "hi"); return a[0]; }
