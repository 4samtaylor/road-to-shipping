/* expect: C4996 */
#include <string.h>
int main(void) { char a[8]; strncpy(a, "hi", sizeof a); return a[0]; }
