/* expect: C4996 */
#include <stdio.h>
int main(void) { int n = 0; scanf("%d", &n); return n; }
