/* expect: C4245 (negative literal to DWORD) */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
int main(void) { if (GetTickCount() == 0) Sleep(-1); return 0; }
