Add-Type -AssemblyName System.Drawing
$img = New-Object System.Drawing.Bitmap("c:\Users\Shailendra Rajpoot\Desktop\ozayra-project\Master\Ozayra master\Frontend\public\ozayra_logo.jpg")

# Let's scan from x=200 to x=800 in steps of 100, and y=200 to y=800 in steps of 100
# to see all yellow colors.
for ($y = 200; $y -le 800; $y += 100) {
    for ($x = 200; $x -le 800; $x += 100) {
        $c = $img.GetPixel($x, $y)
        # Skip if it is black/dark (text/logo) or too red
        if ($c.R -gt 200 -and $c.G -gt 150 -and $c.B -lt 100) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
            Write-Output "$x,$y : $hex"
        }
    }
}

$img.Dispose()
