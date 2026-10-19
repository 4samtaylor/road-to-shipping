/* expect: C4477 */
#include <stdio.h>
#include <string.h>
int main(void) { char s[] = "hi"; printf("%d\n", strlen(s)); return 0; }
