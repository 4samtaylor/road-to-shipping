/* Prints the Windows/MSVC facts the v23 pages rely on. Build and run with run.bat. */
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <stdbool.h>

typedef enum { MENU, PLAYING, GAME_OVER } State;
static const char *const names[] = { [MENU] = "MENU", [PLAYING] = "PLAYING", [GAME_OVER] = "GAME_OVER" };
static inline int twice(int x) { return x * 2; }

int main(void) {
    int score = 7;
    printf("sizeof(int)=%zu long=%zu long_long=%zu pointer=%zu size_t=%zu long_double=%zu\n",
           sizeof(int), sizeof(long), sizeof(long long), sizeof(void *), sizeof(size_t), sizeof(long double));
    printf("char_signed=%s CHAR_MIN=%d\n", ((char)-1 < 0) ? "yes" : "no", CHAR_MIN);
    printf("RAND_MAX=%d\n", RAND_MAX);
    printf("pointer_format=%p\n", (void *)&score);
    printf("designated_init=%s static_inline=%d bool=%d\n", names[PLAYING], twice(21), (int)true);
    printf("neg_div=%d neg_mod=%d\n", -7 / 2, -7 % 2);
#ifdef __STDC_VERSION__
    printf("__STDC_VERSION__=%ldL\n", (long)__STDC_VERSION__);
#else
    printf("__STDC_VERSION__=not defined\n");
#endif
    return 0;
}
