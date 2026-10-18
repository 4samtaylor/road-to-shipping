/* expect: C4018 */
int main(void) { int i = -1; unsigned u = 1; if (i < u) return 1; return 0; }
