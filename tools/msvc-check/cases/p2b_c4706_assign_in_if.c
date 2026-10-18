/* expect: C4706 */
int main(void) { int x = 0; if (x = 5) return 1; return 0; }
