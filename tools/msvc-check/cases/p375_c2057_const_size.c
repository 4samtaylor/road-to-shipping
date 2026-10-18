/* expect: C2057 */
int main(void) { const int N = 5; int a[N]; a[0] = 0; return a[0]; }
