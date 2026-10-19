/* expect: none (MSVC accepts a declaration straight after case, even with /std:c17) */
int main(void) {
    int k = 1;
    switch (k) {
    case 1:
        int x = 2;
        return x;
    }
    return 0;
}
