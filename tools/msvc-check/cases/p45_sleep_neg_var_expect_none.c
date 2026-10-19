/* expect: none (negative int variable to DWORD) */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
int main(void) { int ms = -5; if (GetTickCount() == 0) Sleep(ms); return 0; }
