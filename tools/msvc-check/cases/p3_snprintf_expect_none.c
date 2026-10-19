/* expect: none */
#include <stdio.h>
int main(void) { char a[8]; snprintf(a, sizeof a, "%s", "hi"); return a[0]; }
