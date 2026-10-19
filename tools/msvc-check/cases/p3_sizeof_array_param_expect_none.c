/* expect: none */
#include <stdio.h>
void f(int a[]) { printf("%zu\n", sizeof(a) / sizeof(a[0])); }
int main(void) { int s[5] = {0}; f(s); return 0; }
