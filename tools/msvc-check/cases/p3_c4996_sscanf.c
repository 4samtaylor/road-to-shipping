/* expect: C4996 */
#include <stdio.h>
int main(void) { int n = 0; sscanf("5", "%d", &n); return n; }
