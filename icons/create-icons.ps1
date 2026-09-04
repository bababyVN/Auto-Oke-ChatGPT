Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$size, [string]$path)
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::FromArgb(16, 163, 127))
    
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $fontSize = [Math]::Max(6, $size * 0.4)
    $font = New-Object System.Drawing.Font('Segoe UI', $fontSize, [System.Drawing.FontStyle]::Bold)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString('S', $font, $brush, $rect, $sf)
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created $path"
}

$base = "c:\Users\Admin\Desktop\Tool Kịch bản\icons"
Create-Icon -size 16 -path "$base\icon16.png"
Create-Icon -size 48 -path "$base\icon48.png"
Create-Icon -size 128 -path "$base\icon128.png"
