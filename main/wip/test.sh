if [ $? -eq 0 ]; then
    echo "success"
    echo "success2"
else
    echo not true
fi

if true || false; then
    echo "success"
else
    echo not true
fi

$(echo echo hi)'' {0..$a} \${a#b} $(echo hi) "$(echo hi13)\"$hi ${stuff}\b\n\1\#{}|.*&Y&sup" ((1 + 2 + a)) > a || THING=10 echo "$(echo "c" 1>&2)"

"hi0"a*'c'# && echo ((1+2+a)) && echo '1' > b && echo '2' | c && echo '5' 1>&2 2>/dev/null && ls doesnotexist || ls a && ls b && ls c && ls d && ls e;


VAR1=10 echo hi1

$could_be_command_and_args
${could_be_command_and_args}
echo hi2 || echo bye
echo hi3 && echo bye
echo hi4 | thing && echo bye > 1
echo hi5 | thing && echo bye > 1 &
VAR1=10 VAR2+=11 echo hi6 2>&1 1>&3 || VAR5=10 VAR6=11 thing2 | thing && echo bye > 1 &
VAR7=$((1 + 2 + a)) VAR2+=11 echo hi6 2>&1 1>&3 || VAR5=10 VAR6=11 thing2 | thing && echo bye > 1 &
VAR8=((1 + 2 + a)) VAR2+=11 echo hi6 2>&1 1>&3 || VAR5=10 VAR6=11 thing2 | thing && echo bye > 1 &

cat <<< "hi19"

read -r -d '' VAR <<'HEREDOC_NAME'
string contents
HEREDOC_NAME
echo "hi18" > ${VAR1:1}