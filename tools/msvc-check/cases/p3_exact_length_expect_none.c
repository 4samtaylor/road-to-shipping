/* expect: C4295 */
#include <stdio.h>
int main(void) { char c[3] = "Sam"; printf("%c\n", c[0]); return 0; }
