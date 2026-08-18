package ai.arena.abhi
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Ink=Color(0xFFEFF2EF); private val Mint=Color(0xFF8DE4C0); private val Night=Color(0xFF080B0E); private val Panel=Color(0xFF101518)
class MainActivity:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{AbhiApp()}}}
@Composable fun AbhiApp(){var tab by remember{mutableIntStateOf(0)};MaterialTheme(colorScheme=darkColorScheme(primary=Mint,background=Night,surface=Panel,onBackground=Ink)){Scaffold(containerColor=Night,bottomBar={NavigationBar(containerColor=Color(0xFF0B0F12)){listOf("Office","Chat","Tasks","Memory","Settings").forEachIndexed{i,s->NavigationBarItem(selected=tab==i,onClick={tab=i},icon={Text(listOf("⌂","✦","▣","◈","⚙")[i])},label={Text(s,fontSize=9.sp)})}}}){pad->Box(Modifier.padding(pad).fillMaxSize()){if(tab==0)OfficeScreen() else PlaceholderScreen(listOf("Office","Chat","Tasks","Memory","Settings")[tab])}}}}
@Composable fun OfficeScreen(){Column(Modifier.fillMaxSize().padding(20.dp)){Row(verticalAlignment=Alignment.CenterVertically){Box(Modifier.size(36.dp).background(Color(0xFF12221D),CutCornerShape(8.dp)),contentAlignment=Alignment.Center){Text("A",color=Mint,fontWeight=FontWeight.Bold)};Spacer(Modifier.width(10.dp));Column{Text("ABHI",fontWeight=FontWeight.Bold,letterSpacing=2.sp);Text("● ONLINE",fontSize=9.sp,color=Mint)}};Spacer(Modifier.height(24.dp));Box(Modifier.fillMaxWidth().weight(1f).background(Color(0xFF10191C),RoundedCornerShape(4.dp)).border(1.dp,Color(0xFF283235),RoundedCornerShape(4.dp))){Canvas(Modifier.fillMaxSize()){drawRect(Color(0xFF182326),topLeft=androidx.compose.ui.geometry.Offset(size.width*.12f,size.height*.12f),size=androidx.compose.ui.geometry.Size(size.width*.32f,size.height*.3f));drawRect(Color(0xFF4A4036),topLeft=androidx.compose.ui.geometry.Offset(size.width*.14f,size.height*.63f),size=androidx.compose.ui.geometry.Size(size.width*.72f,12f));drawCircle(Mint,radius=15f,center=androidx.compose.ui.geometry.Offset(size.width*.5f,size.height*.48f));drawRoundRect(Color(0xFF59615E),topLeft=androidx.compose.ui.geometry.Offset(size.width*.4f,size.height*.38f),size=androidx.compose.ui.geometry.Size(size.width*.2f,size.height*.26f),cornerRadius=androidx.compose.ui.geometry.CornerRadius(18f))};Column(Modifier.align(Alignment.BottomStart).padding(18.dp)){Text("IDLE",color=Mint,fontSize=9.sp,letterSpacing=2.sp);Text("Hey. What are we working on?",fontWeight=FontWeight.SemiBold)}};Spacer(Modifier.height(14.dp));OutlinedTextField(value="",onValueChange={},placeholder={Text("Give ABHI a job…")},modifier=Modifier.fillMaxWidth(),trailingIcon={Text("↑",color=Mint,fontSize=22.sp)})}}
@Composable fun PlaceholderScreen(title:String){Column(Modifier.fillMaxSize().padding(24.dp)){Text(title.uppercase(),fontSize=10.sp,color=Mint,letterSpacing=2.sp);Spacer(Modifier.height(8.dp));Text(title,fontSize=30.sp,fontWeight=FontWeight.Bold);Spacer(Modifier.height(12.dp));Text("Native ABHI workspace. This screen connects to the shared authenticated backend in the next implementation phase.",color=Color(0xFF88928F))}}
